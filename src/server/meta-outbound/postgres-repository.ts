import type { PoolClient } from 'pg';
import type { NormalizedOutboundMessage, OutboundDeliveryRecord, OutboundDeliveryStatus } from './contracts.js';
import type { ClaimResult, EnqueueResult, OutboundDeliveryRepository } from './repository.js';

function map(row: any): OutboundDeliveryRecord {
  return {
    id: String(row.id), message: row.payload as NormalizedOutboundMessage,
    payloadFingerprint: String(row.payload_fingerprint ?? ''), status: row.status as OutboundDeliveryStatus,
    attemptCount: Number(row.attempt_count), externalMessageId: row.provider_message_id ?? null,
    lastErrorCode: row.last_error ?? null, createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(), sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
  };
}

/** Durable queue repository. A provider is injected separately; this class never sends network traffic. */
export class PostgresOutboundDeliveryRepository implements OutboundDeliveryRepository {
  constructor(private readonly tx: PoolClient, private readonly storeId: string) {}

  async enqueue(message: NormalizedOutboundMessage, payloadFingerprint: string, now: string): Promise<EnqueueResult> {
    const id = `${this.storeId}:${message.idempotencyKey}`;
    const existing = await this.tx.query('SELECT *, payload_fingerprint FROM relic_messaging.outbound_messages WHERE id=$1', [id]);
    if (existing.rows.length) {
      return { outcome: existing.rows[0].payload_fingerprint === payloadFingerprint ? 'EXISTING' : 'CONFLICT', record: map(existing.rows[0]) };
    }
    const result = await this.tx.query(`INSERT INTO relic_messaging.outbound_messages
      (id,store_id,channel,conversation_id,external_recipient_id,related_inbound_event_id,payload,payload_fingerprint,status,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'QUEUED',$9,$9) RETURNING *`,
    [id, this.storeId, message.channel, message.conversationId, message.recipientId, message.replyToMessageId ?? null,
      JSON.stringify(message), payloadFingerprint, now]);
    return { outcome: 'CREATED', record: map(result.rows[0]) };
  }

  async claim(id: string, now: string): Promise<ClaimResult> {
    const result = await this.tx.query(`UPDATE relic_messaging.outbound_messages
      SET status='SENDING',attempt_count=attempt_count+1,updated_at=$2
      WHERE id=$1 AND status IN ('QUEUED','RETRYABLE_FAILURE') RETURNING *`, [id, now]);
    if (result.rows.length) return { outcome: 'CLAIMED', record: map(result.rows[0]) };
    const current = await this.tx.query('SELECT * FROM relic_messaging.outbound_messages WHERE id=$1', [id]);
    if (!current.rows.length) throw new Error('OUTBOUND_DELIVERY_NOT_FOUND');
    return { outcome: ['SENT','FAILED'].includes(current.rows[0].status) ? 'TERMINAL' : 'BUSY', record: map(current.rows[0]) };
  }

  async claimNext(now: string): Promise<OutboundDeliveryRecord | null> {
    const result = await this.tx.query(`WITH candidate AS (
        SELECT id FROM relic_messaging.outbound_messages
        WHERE store_id=$1 AND status IN ('QUEUED','RETRYABLE_FAILURE')
        ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE relic_messaging.outbound_messages AS outbound
      SET status='SENDING', attempt_count=outbound.attempt_count+1, updated_at=$2
      FROM candidate WHERE outbound.id=candidate.id RETURNING outbound.*`, [this.storeId, now]);
    return result.rows.length ? map(result.rows[0]) : null;
  }

  async complete(id: string, update: { status: Exclude<OutboundDeliveryStatus, 'QUEUED'>; externalMessageId: string | null; errorCode: string | null; now: string }): Promise<OutboundDeliveryRecord> {
    const result = await this.tx.query(`UPDATE relic_messaging.outbound_messages SET status=$2,provider_message_id=$3,last_error=$4,
      updated_at=$5,sent_at=CASE WHEN $2='SENT' THEN $5 ELSE sent_at END WHERE id=$1 RETURNING *`,
    [id, update.status, update.externalMessageId, update.errorCode, update.now]);
    if (!result.rows.length) throw new Error('OUTBOUND_DELIVERY_NOT_FOUND');
    return map(result.rows[0]);
  }

  async getByIdempotencyKey(idempotencyKey: string): Promise<OutboundDeliveryRecord | null> {
    const result = await this.tx.query('SELECT * FROM relic_messaging.outbound_messages WHERE id=$1', [`${this.storeId}:${idempotencyKey}`]);
    return result.rows.length ? map(result.rows[0]) : null;
  }
}
