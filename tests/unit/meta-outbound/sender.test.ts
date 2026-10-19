// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  InMemoryOutboundDeliveryRepository,
  MetaOutboundSender,
  NormalizedOutboundMessageSchema,
  type MetaOutboundProvider,
  type MetaProviderResult,
  type NormalizedOutboundMessage,
} from '../../../src/server/meta-outbound';

class FakeMetaProvider implements MetaOutboundProvider {
  readonly messages: NormalizedOutboundMessage[] = [];
  readonly results: Array<MetaProviderResult | Error> = [];
  private blocker: Promise<void> | null = null;

  blockUntil(promise: Promise<void>) {
    this.blocker = promise;
  }

  async send(message: NormalizedOutboundMessage): Promise<MetaProviderResult> {
    this.messages.push(message);
    if (this.blocker) await this.blocker;
    const result = this.results.shift() ?? { status: 'SENT', externalMessageId: `fake-${this.messages.length}` };
    if (result instanceof Error) throw result;
    return result;
  }
}

const baseMessage = {
  idempotencyKey: 'event-1:response-1',
  correlationId: 'event-1',
  conversationId: 'conversation-1',
  recipientId: 'customer-1',
  channel: 'instagram' as const,
  kind: 'text' as const,
  text: 'La talla M está disponible.',
};

function setup() {
  const provider = new FakeMetaProvider();
  const repository = new InMemoryOutboundDeliveryRepository();
  let tick = 0;
  const sender = new MetaOutboundSender(provider, repository, {
    now: () => new Date(`2026-10-15T00:00:0${tick++}.000Z`),
  });
  return { provider, repository, sender };
}

describe('MetaOutboundSender', () => {
  it.each(['instagram', 'messenger'] as const)('normalizes and sends %s messages exactly once', async channel => {
    const { provider, repository, sender } = setup();
    const message = { ...baseMessage, channel, idempotencyKey: `${channel}:event-1` };

    const first = await sender.send(message);
    const duplicate = await sender.send(message);

    expect(first.status).toBe('SENT');
    expect(first.record.attemptCount).toBe(1);
    expect(first.record.externalMessageId).toBe('fake-1');
    expect(duplicate).toMatchObject({ status: 'SENT', duplicate: true });
    expect(provider.messages).toEqual([NormalizedOutboundMessageSchema.parse(message)]);
    expect((await repository.getByIdempotencyKey(message.idempotencyKey))?.status).toBe('SENT');
  });

  it('coalesces concurrent duplicates while a delivery is in flight', async () => {
    const { provider, sender } = setup();
    let release!: () => void;
    provider.blockUntil(new Promise<void>(resolve => { release = resolve; }));

    const firstPromise = sender.send(baseMessage);
    await Promise.resolve();
    const duplicate = await sender.send(baseMessage);
    release();
    const first = await firstPromise;

    expect(first.status).toBe('SENT');
    expect(duplicate).toMatchObject({ status: 'RETRYABLE', duplicate: true });
    expect(provider.messages).toHaveLength(1);
  });

  it('persists retryable failure and succeeds on a later retry without a duplicate send', async () => {
    const { provider, sender } = setup();
    provider.results.push(
      { status: 'FAILED', retryable: true, errorCode: 'temporary outage details' },
      { status: 'SENT', externalMessageId: 'meta-2' },
    );

    const failed = await sender.send(baseMessage);
    const retried = await sender.send(baseMessage);
    const duplicate = await sender.send(baseMessage);

    expect(failed).toMatchObject({ status: 'RETRYABLE', record: { attemptCount: 1 } });
    expect(failed.record.lastErrorCode).toBe('TEMPORARY_OUTAGE_DETAILS');
    expect(retried).toMatchObject({ status: 'SENT', record: { attemptCount: 2, externalMessageId: 'meta-2' } });
    expect(duplicate).toMatchObject({ status: 'SENT', duplicate: true });
    expect(provider.messages).toHaveLength(2);
  });

  it('does not retry a permanent provider failure', async () => {
    const { provider, sender } = setup();
    provider.results.push({ status: 'FAILED', retryable: false, errorCode: 'recipient_not_allowed' });

    expect(await sender.send({ ...baseMessage, kind: 'handoff' })).toMatchObject({
      status: 'FAILED', record: { attemptCount: 1, lastErrorCode: 'RECIPIENT_NOT_ALLOWED' },
    });
    expect(await sender.send({ ...baseMessage, kind: 'handoff' })).toMatchObject({ status: 'FAILED', duplicate: true });
    expect(provider.messages).toHaveLength(1);
  });

  it('fails closed on provider exceptions without exposing exception text', async () => {
    const { provider, sender } = setup();
    provider.results.push(new Error('token=do-not-persist-this'));

    const result = await sender.send({ ...baseMessage, kind: 'fallback' });

    expect(result).toMatchObject({
      status: 'RETRYABLE', record: { lastErrorCode: 'PROVIDER_UNAVAILABLE', externalMessageId: null },
    });
    expect(JSON.stringify(result)).not.toContain('do-not-persist-this');
  });

  it('rejects conflicting reuse of an idempotency key', async () => {
    const { provider, sender } = setup();
    await sender.send(baseMessage);

    await expect(sender.send({ ...baseMessage, text: 'A different response' }))
      .rejects.toThrow('OUTBOUND_IDEMPOTENCY_CONFLICT');
    expect(provider.messages).toHaveLength(1);
  });

  it('rejects malformed messages before enqueueing or calling a provider', async () => {
    const { provider, repository, sender } = setup();

    await expect(sender.send({ ...baseMessage, channel: 'whatsapp' })).rejects.toThrow();
    await expect(sender.send({ ...baseMessage, token: 'must-not-be-accepted' })).rejects.toThrow();
    expect(provider.messages).toHaveLength(0);
    expect(await repository.getByIdempotencyKey(baseMessage.idempotencyKey)).toBeNull();
  });
});
