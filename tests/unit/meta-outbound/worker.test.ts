// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DurableOutboundWorker,
  InMemoryOutboundDeliveryRepository,
  type MetaOutboundProvider,
  type MetaProviderResult,
} from '../../../src/server/meta-outbound';

const message = {
  idempotencyKey: 'worker:event-1', correlationId: 'event-1', conversationId: 'conversation-1',
  recipientId: 'customer-1', channel: 'instagram' as const, kind: 'text' as const, text: 'Hola',
};

class FakeProvider implements MetaOutboundProvider {
  calls = 0;
  results: MetaProviderResult[] = [];
  async send() { this.calls += 1; return this.results.shift() ?? { status: 'SENT' as const, externalMessageId: `meta-${this.calls}` }; }
}

async function enqueue(repository: InMemoryOutboundDeliveryRepository, input = message) {
  await repository.enqueue(input, `fingerprint-${input.idempotencyKey}`, new Date().toISOString());
}

describe('DurableOutboundWorker', () => {
  it('drains queued messages to SENT', async () => {
    const repository = new InMemoryOutboundDeliveryRepository(); const provider = new FakeProvider();
    await enqueue(repository);
    const result = await new DurableOutboundWorker(repository, provider).runBatch();
    expect(result).toMatchObject({ claimed: 1, sent: 1 }); expect(provider.calls).toBe(1);
  });

  it('keeps retryable failures bounded and resumes them', async () => {
    const repository = new InMemoryOutboundDeliveryRepository(); const provider = new FakeProvider();
    provider.results.push({ status: 'FAILED', retryable: true, errorCode: 'temporary' }, { status: 'SENT', externalMessageId: 'meta-2' });
    await enqueue(repository);
    const worker = new DurableOutboundWorker(repository, provider, { maxAttempts: 3, batchSize: 1 });
    expect(await worker.runBatch()).toMatchObject({ retryable: 1 });
    expect(await worker.runBatch()).toMatchObject({ sent: 1 }); expect(provider.calls).toBe(2);
  });

  it('concurrent workers atomically claim one logical message', async () => {
    const repository = new InMemoryOutboundDeliveryRepository(); const provider = new FakeProvider();
    await enqueue(repository);
    const [first, second] = await Promise.all([
      new DurableOutboundWorker(repository, provider).runBatch(),
      new DurableOutboundWorker(repository, provider).runBatch(),
    ]);
    expect(first.claimed + second.claimed).toBe(1); expect(provider.calls).toBe(1);
  });

  it('does not resend a SENT message after a worker restart', async () => {
    const repository = new InMemoryOutboundDeliveryRepository(); const provider = new FakeProvider();
    await enqueue(repository);
    await new DurableOutboundWorker(repository, provider).runBatch();
    await new DurableOutboundWorker(repository, provider).runBatch();
    expect(provider.calls).toBe(1);
  });

  it('marks a permanent provider failure FAILED', async () => {
    const repository = new InMemoryOutboundDeliveryRepository(); const provider = new FakeProvider();
    provider.results.push({ status: 'FAILED', retryable: false, errorCode: 'not_allowed' }); await enqueue(repository);
    const result = await new DurableOutboundWorker(repository, provider).runBatch();
    expect(result.failed).toBe(1); expect((await repository.getByIdempotencyKey(message.idempotencyKey))?.status).toBe('FAILED');
  });
});
