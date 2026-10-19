import type {
  NormalizedOutboundMessage,
  OutboundDeliveryRecord,
  OutboundDeliveryStatus,
} from './contracts.js';

export type EnqueueResult =
  | { outcome: 'CREATED' | 'EXISTING'; record: OutboundDeliveryRecord }
  | { outcome: 'CONFLICT'; record: OutboundDeliveryRecord };

export type ClaimResult =
  | { outcome: 'CLAIMED'; record: OutboundDeliveryRecord }
  | { outcome: 'BUSY' | 'TERMINAL'; record: OutboundDeliveryRecord };

export interface OutboundDeliveryRepository {
  enqueue(message: NormalizedOutboundMessage, payloadFingerprint: string, now: string): Promise<EnqueueResult>;
  claimNext(now: string): Promise<OutboundDeliveryRecord | null>;
  claim(id: string, now: string): Promise<ClaimResult>;
  complete(
    id: string,
    update: {
      status: Exclude<OutboundDeliveryStatus, 'QUEUED'>;
      externalMessageId: string | null;
      errorCode: string | null;
      now: string;
    },
  ): Promise<OutboundDeliveryRecord>;
  getByIdempotencyKey(idempotencyKey: string): Promise<OutboundDeliveryRecord | null>;
}

function copy(record: OutboundDeliveryRecord): OutboundDeliveryRecord {
  return { ...record, message: { ...record.message } };
}

/** Test/local repository. Production must inject an atomic durable implementation. */
export class InMemoryOutboundDeliveryRepository implements OutboundDeliveryRepository {
  private readonly recordsByKey = new Map<string, OutboundDeliveryRecord>();
  private readonly keysById = new Map<string, string>();
  private readonly claims = new Set<string>();
  private sequence = 0;

  async enqueue(message: NormalizedOutboundMessage, payloadFingerprint: string, now: string): Promise<EnqueueResult> {
    const existing = this.recordsByKey.get(message.idempotencyKey);
    if (existing) {
      return {
        outcome: existing.payloadFingerprint === payloadFingerprint ? 'EXISTING' : 'CONFLICT',
        record: copy(existing),
      };
    }

    const id = `outbound-${++this.sequence}`;
    const record: OutboundDeliveryRecord = {
      id,
      message: { ...message },
      payloadFingerprint,
      status: 'QUEUED',
      attemptCount: 0,
      externalMessageId: null,
      lastErrorCode: null,
      createdAt: now,
      updatedAt: now,
      sentAt: null,
    };
    this.recordsByKey.set(message.idempotencyKey, record);
    this.keysById.set(id, message.idempotencyKey);
    return { outcome: 'CREATED', record: copy(record) };
  }

  async claim(id: string, now: string): Promise<ClaimResult> {
    const record = this.getMutableById(id);
    if (record.status === 'SENT' || record.status === 'FAILED') {
      return { outcome: 'TERMINAL', record: copy(record) };
    }
    if (this.claims.has(id)) return { outcome: 'BUSY', record: copy(record) };

    this.claims.add(id);
    record.attemptCount += 1;
    record.updatedAt = now;
    return { outcome: 'CLAIMED', record: copy(record) };
  }

  async claimNext(now: string): Promise<OutboundDeliveryRecord | null> {
    const record = [...this.recordsByKey.values()].find(candidate => candidate.status === 'QUEUED' || candidate.status === 'RETRYABLE' || candidate.status === 'RETRYABLE_FAILURE');
    if (!record) return null;
    const claimed = await this.claim(record.id, now);
    return claimed.outcome === 'CLAIMED' ? claimed.record : null;
  }

  async complete(
    id: string,
    update: {
      status: Exclude<OutboundDeliveryStatus, 'QUEUED'>;
      externalMessageId: string | null;
      errorCode: string | null;
      now: string;
    },
  ): Promise<OutboundDeliveryRecord> {
    if (!this.claims.has(id)) throw new Error('OUTBOUND_DELIVERY_NOT_CLAIMED');
    const record = this.getMutableById(id);
    record.status = update.status;
    record.externalMessageId = update.externalMessageId;
    record.lastErrorCode = update.errorCode;
    record.updatedAt = update.now;
    record.sentAt = update.status === 'SENT' ? update.now : null;
    this.claims.delete(id);
    return copy(record);
  }

  async getByIdempotencyKey(idempotencyKey: string): Promise<OutboundDeliveryRecord | null> {
    const record = this.recordsByKey.get(idempotencyKey);
    return record ? copy(record) : null;
  }

  private getMutableById(id: string): OutboundDeliveryRecord {
    const key = this.keysById.get(id);
    const record = key ? this.recordsByKey.get(key) : undefined;
    if (!record) throw new Error('OUTBOUND_DELIVERY_NOT_FOUND');
    return record;
  }
}
