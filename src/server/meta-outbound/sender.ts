import { createHash } from 'node:crypto';
import {
  NormalizedOutboundMessageSchema,
  type NormalizedOutboundMessage,
  type OutboundDeliveryRecord,
  type OutboundSendResult,
} from './contracts.js';
import type { MetaOutboundProvider, MetaProviderResult } from './provider.js';
import type { OutboundDeliveryRepository } from './repository.js';

export interface OutboundSenderOptions {
  now?: () => Date;
}

function fingerprint(message: NormalizedOutboundMessage): string {
  const stablePayload = JSON.stringify({
    channel: message.channel,
    conversationId: message.conversationId,
    correlationId: message.correlationId,
    idempotencyKey: message.idempotencyKey,
    kind: message.kind,
    recipientId: message.recipientId,
    replyToMessageId: message.replyToMessageId ?? null,
    text: message.text,
  });
  return createHash('sha256').update(stablePayload).digest('hex');
}

function sanitizeErrorCode(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 80);
  return normalized || fallback;
}

function asResult(record: OutboundDeliveryRecord, duplicate: boolean): OutboundSendResult {
  if (record.status === 'SENT') return { status: 'SENT', record, duplicate };
  if (record.status === 'FAILED') return { status: 'FAILED', record, duplicate };
  return { status: 'RETRYABLE', record, duplicate };
}

/** Requires explicit provider and repository injection; there is no live/default sender. */
export class MetaOutboundSender {
  private readonly now: () => Date;

  constructor(
    private readonly provider: MetaOutboundProvider,
    private readonly repository: OutboundDeliveryRepository,
    options: OutboundSenderOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async send(input: unknown): Promise<OutboundSendResult> {
    const message = NormalizedOutboundMessageSchema.parse(input);
    const now = this.now().toISOString();
    const enqueued = await this.repository.enqueue(message, fingerprint(message), now);
    if (enqueued.outcome === 'CONFLICT') throw new Error('OUTBOUND_IDEMPOTENCY_CONFLICT');
    if (enqueued.record.status === 'SENT' || enqueued.record.status === 'FAILED') {
      return asResult(enqueued.record, true);
    }

    const claimed = await this.repository.claim(enqueued.record.id, now);
    if (claimed.outcome !== 'CLAIMED') return asResult(claimed.record, true);

    let providerResult: MetaProviderResult;
    try {
      providerResult = await this.provider.send(message);
    } catch {
      providerResult = { status: 'FAILED', retryable: true, errorCode: 'PROVIDER_UNAVAILABLE' };
    }

    if (providerResult.status === 'SENT') {
      const record = await this.repository.complete(claimed.record.id, {
        status: 'SENT',
        externalMessageId: providerResult.externalMessageId.trim().slice(0, 200) || null,
        errorCode: null,
        now: this.now().toISOString(),
      });
      return { status: 'SENT', record, duplicate: enqueued.outcome === 'EXISTING' };
    }

    const status = providerResult.retryable ? 'RETRYABLE_FAILURE' : 'FAILED';
    const record = await this.repository.complete(claimed.record.id, {
      status,
      externalMessageId: null,
      errorCode: sanitizeErrorCode(providerResult.errorCode, 'PROVIDER_FAILURE'),
      now: this.now().toISOString(),
    });
    return { status: status === 'RETRYABLE_FAILURE' ? 'RETRYABLE' : 'FAILED', record, duplicate: enqueued.outcome === 'EXISTING' };
  }
}
