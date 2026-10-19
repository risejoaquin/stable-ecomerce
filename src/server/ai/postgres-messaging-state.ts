import type { Pool, PoolClient } from 'pg';
import type { CareState } from './customer-care-orchestrator.js';

export interface CommercialConversationSnapshot {
  care: CareState;
  cart: unknown | null;
  orderDraft: unknown | null;
  handoff: unknown | null;
  messages: unknown[];
  outboundDelivery: unknown | null;
}
export interface DurableEventResult<T> { duplicate: boolean; result: T }

/** Only backend services receive the transaction; neither provider nor tools declarations expose SQL. */
export class PostgresMessagingState {
  constructor(private readonly pool: Pool) {}

  async process<T>(scope: string, eventId: string, fingerprint: string,
    handler: (snapshot: CommercialConversationSnapshot, transaction: PoolClient) => Promise<T>): Promise<DurableEventResult<T>> {
    if (!scope || !eventId || !/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('INVALID_EVENT_IDENTITY');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '5s'");
      const initial: CommercialConversationSnapshot = { care: { version: 0, lastEventId: '', handoffRequired: false },
        cart: null, orderDraft: null, handoff: null, messages: [], outboundDelivery: null };
      await client.query('INSERT INTO relic_messaging.conversations (scope, snapshot) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [scope, JSON.stringify(initial)]);
      // Serialize all messages for a conversation across processes, not only duplicate events.
      const locked = await client.query('SELECT snapshot FROM relic_messaging.conversations WHERE scope=$1 FOR UPDATE', [scope]);
      const prior = await client.query('SELECT fingerprint, result FROM relic_messaging.processed_events WHERE scope=$1 AND event_id=$2',
        [scope, eventId]);
      if (prior.rows.length) {
        if (prior.rows[0].fingerprint !== fingerprint) throw new Error('EVENT_ID_CONFLICT');
        await client.query('COMMIT');
        return { duplicate: true, result: prior.rows[0].result as T };
      }
      const snapshot: CommercialConversationSnapshot = locked.rows[0].snapshot;
      const result = await handler(snapshot, client);
      await client.query('UPDATE relic_messaging.conversations SET snapshot=$2, updated_at=now() WHERE scope=$1',
        [scope, JSON.stringify(snapshot)]);
      await client.query('INSERT INTO relic_messaging.processed_events (scope,event_id,fingerprint,result) VALUES ($1,$2,$3,$4)',
        [scope, eventId, fingerprint, JSON.stringify(result)]);
      await client.query('COMMIT');
      return { duplicate: false, result };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}
