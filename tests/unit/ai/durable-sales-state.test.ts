// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { PostgresMessagingState } from '../../../src/server/ai/postgres-messaging-state';

const url = process.env.SALES_AUTOMATION_TEST_DATABASE_URL;
const fingerprint = createHash('sha256').update('fixture-message').digest('hex');
describe.skipIf(!url)('isolated PostgreSQL durable commercial state', () => {
  it('survives connection/engine restart, serializes duplicate events, and rolls back failure', async () => {
    const parsed = new URL(url!);
    if (parsed.hostname !== '127.0.0.1' || parsed.port !== '55439' || parsed.pathname !== '/relic_sales_test' || parsed.search) {
      throw new Error('ISOLATED_TEST_DATABASE_REQUIRED');
    }
    let pool = new Pool({ connectionString: url, max: 4 });
    try {
      await pool.query(await readFile('scripts/db/relic-messaging-local-schema.sql', 'utf8'));
      const scope = `fixture-${Date.now()}`;
      let executions = 0;
      const state = new PostgresMessagingState(pool);
      const handler = async (snapshot: any) => {
        executions++;
        snapshot.care.version++; snapshot.care.lastEventId = 'order-event';
        snapshot.cart = { id: 'fixture-cart', quantity: 1 };
        snapshot.orderDraft = { id: 'fixture-draft', status: 'ORDER_DRAFT_CREATED', paymentStatus: 'unpaid' };
        snapshot.messages.push({ id: 'order-event', state: 'PROCESSED' });
        snapshot.handoff = { status: 'NONE' };
        snapshot.outboundDelivery = { status: 'DRAFT_ONLY', liveSend: false };
        return { id: 'fixture-draft' };
      };
      const concurrent = await Promise.all([state.process(scope, 'order-event', fingerprint, handler),
        state.process(scope, 'order-event', fingerprint, handler)]);
      expect(executions).toBe(1); expect(concurrent.filter(x => x.duplicate)).toHaveLength(1);
      await pool.end(); pool = new Pool({ connectionString: url });
      const restarted = new PostgresMessagingState(pool);
      expect((await restarted.process(scope, 'order-event', fingerprint, handler)).duplicate).toBe(true);
      expect(executions).toBe(1);
      await expect(restarted.process(scope, 'failed-event', fingerprint, async snapshot => {
        snapshot.cart = { id: 'should-rollback' }; throw new Error('fixture dependency failure');
      })).rejects.toThrow('fixture dependency failure');
      const saved = await pool.query('SELECT snapshot FROM relic_messaging.conversations WHERE scope=$1', [scope]);
      expect(saved.rows[0].snapshot.cart.id).toBe('fixture-cart');
      expect(saved.rows[0].snapshot.orderDraft.id).toBe('fixture-draft');
      expect(saved.rows[0].snapshot.outboundDelivery.liveSend).toBe(false);
      await expect(restarted.process(scope, 'order-event', '0'.repeat(64), handler)).rejects.toThrow('EVENT_ID_CONFLICT');
      expect((await restarted.process(scope, 'failed-event', fingerprint, handler)).duplicate).toBe(false);
    } finally { await pool.end(); }
  });
});
