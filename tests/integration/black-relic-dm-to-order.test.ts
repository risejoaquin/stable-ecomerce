import crypto from 'node:crypto';
import express from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMessagingRouter } from '../../src/server/ai/messaging-router.js';
import { createBlackRelicSalesRuntime } from '../../src/server/ai/black-relic-sales-runtime.js';
import type { GoogleAiProvider } from '../../src/server/ai/google-provider-types.js';
import type { MetaOutboundProvider } from '../../src/server/meta-outbound/provider.js';
import type { NormalizedOutboundMessage } from '../../src/server/meta-outbound/contracts.js';
import { PostgresOutboundDeliveryRepository } from '../../src/server/meta-outbound/postgres-repository.js';
import { DurableOutboundWorker } from '../../src/server/meta-outbound/worker.js';
import { PostgresCommerceAdapter } from '../../src/server/ai/tools/postgres-commerce-adapter.js';

const databaseUrl = process.env.SALES_AUTOMATION_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const storeId = '00000000-0000-4000-8000-000000000001';
const productId = '00000000-0000-4000-8000-000000000010';
const appSecret = 'local-e2e-app-secret';
const verifyToken = 'local-e2e-verify-token';
const email = 'synthetic.customer@example.test';

class FakeGoogleProvider implements GoogleAiProvider {
  readonly mode = 'mock' as const;
  private callIndex: number;
  constructor(startIndex = 0, private readonly orderId?: string) { this.callIndex = startIndex; }
  getModel() { return 'fake-local-e2e'; }
  async healthCheck() { return { status: 'healthy' as const, provider: 'google-genai' as const, model: this.getModel(), mode: this.mode }; }
  async generate(request: any) {
    const text = String(request.contents?.at(-1)?.parts?.[0]?.text ?? '').toLowerCase();
    const sequence = this.callIndex++;
    if (sequence === 1) return this.response('create_cart', { items: [{ productId, variantName: 'M / negro', quantity: 2 }] });
    if (sequence === 2) return this.response('get_delivery_options', { postalCode: '83000', city: 'Hermosillo', country: 'MX' });
    if (sequence === 3) return this.response('get_payment_options', { currency: 'MXN' });
    if (sequence === 4) return this.response('get_product', { productId });
    if (sequence >= 6 && this.orderId) return this.response('get_order_status', { orderId: this.orderId, customerEmail: email });
    if (sequence >= 5) return this.response('create_order_draft', {});
    if (text.includes('quiero dos')) return this.response('create_cart', { items: [{ productId, variantName: 'M / negro', quantity: 2 }] });
    if (text.includes('envío') || text.includes('envio')) return this.response('get_delivery_options', { postalCode: '83000', city: 'Hermosillo', country: 'MX' });
    if (text.includes('transferencia')) return this.response('get_payment_options', { currency: 'MXN' });
    if (text.includes('confirmo')) return this.response('create_order_draft', {});
    if (text.includes('datos')) return this.response('get_product', { productId });
    return { functionCalls: [
      { name: 'search_products', args: { query: 'playera negra', limit: 10 } },
      { name: 'get_product', args: { productId } },
      { name: 'get_variant_stock', args: { productId, variantName: 'M / negro' } },
      { name: 'get_price', args: { productId, variantName: 'M / negro', quantity: 1 } },
    ], metadata: this.metadata() };
  }
  private response(name: string, args: Record<string, unknown>) { return { functionCalls: [{ name, args }], metadata: this.metadata() }; }
  private metadata() { return { model: this.getModel(), latencyMs: 0, attempts: 1, providerMode: this.mode }; }
}

class FakeMetaProvider implements MetaOutboundProvider {
  readonly messages: NormalizedOutboundMessage[] = [];
  async send(message: NormalizedOutboundMessage) {
    this.messages.push(message);
    return { status: 'SENT' as const, externalMessageId: `fake-${message.idempotencyKey}` };
  }
}

class RetryableMetaProvider implements MetaOutboundProvider {
  async send() { return { status: 'FAILED' as const, retryable: true, errorCode: 'SYNTHETIC_PROVIDER_DOWN' }; }
}

function signedBody(body: unknown) {
  const raw = JSON.stringify(body);
  return { raw, signature: `sha256=${crypto.createHmac('sha256', appSecret).update(raw).digest('hex')}` };
}

  function message(eventId: string, text: string, timestamp = Date.now()) {
  return { object: 'instagram', entry: [{ id: 'test_ig_black_relic', messaging: [{ sender: { id: 'test_customer_black_relic' }, recipient: { id: 'test_ig_black_relic' }, timestamp, message: { mid: eventId, text } }] }] };
}

describeDatabase('BLACK RELIC local DM to order', () => {
  let pool: Pool;
  let app: express.Express;
  let fakeMeta: FakeMetaProvider;

  async function resetDatabase() {
    await pool.query('TRUNCATE relic_messaging.outbound_messages, relic_messaging.processed_events, relic_messaging.conversations, relic_messaging.carts, relic_messaging.order_links, relic_messaging.tool_idempotency RESTART IDENTITY CASCADE');
    await pool.query("DELETE FROM public.orders WHERE store_id=$1", [storeId]);
    await pool.query(`UPDATE public.products SET price=499,stock=10,status='active',variants=$2::jsonb WHERE id=$1`, [productId, JSON.stringify([
      { id: '00000000-0000-4000-8000-000000000011', name: 'M / negro', sku: 'RELIC-M-NEGRO', price: 499, stock: 10 },
      { id: '00000000-0000-4000-8000-000000000012', name: 'L / negro', sku: 'RELIC-L-NEGRO', price: 499, stock: 10 },
    ])]);
  }

  function mountRuntime(provider: GoogleAiProvider = new FakeGoogleProvider(0), outboundProvider: MetaOutboundProvider | undefined = fakeMeta) {
    const runtime = createBlackRelicSalesRuntime({
      pool, storeId, appSecret, verifyToken, providerMode: 'mock', provider, outboundProvider,
      identityContext: { customerEmail: email, customerName: 'Synthetic Customer', selectedProductId: productId, selectedVariantName: 'M / negro', deliveryMethod: 'shipping', paymentMethod: 'transfer', postalCode: '83000', shippingAddress: { postalCode: '83000', city: 'Hermosillo', country: 'MX' } },
    });
    app = express();
    app.use('/api/webhooks/meta', createMessagingRouter(runtime.webhookConfig, runtime.pipeline));
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await resetDatabase();
    fakeMeta = new FakeMetaProvider();
    mountRuntime();
  });

  afterAll(async () => { await pool?.end(); });

  async function post(eventId: string, text: string, timestamp?: number) {
    const signed = signedBody(message(eventId, text, timestamp));
    return request(app).post('/api/webhooks/meta').set('x-hub-signature-256', signed.signature).set('content-type', 'application/json').send(signed.raw);
  }

  it('runs signed Instagram DM through DB-backed commerce and creates one unpaid draft', async () => {
    const first = await post('dm-001', 'tienes la playera negra en M?');
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect((await post('dm-002', 'quiero dos')).status).toBe(200);
    expect((await post('dm-003', 'envío')).status).toBe(200);
    expect((await post('dm-004', 'transferencia')).status).toBe(200);
    expect((await post('dm-005', 'mis datos son sintéticos')).status).toBe(200);
    expect((await post('dm-006', 'confirmo')).status).toBe(200);

    const evidence = await pool.query(`SELECT
      (SELECT count(*) FROM relic_messaging.conversations) AS conversations,
      (SELECT count(*) FROM relic_messaging.carts) AS carts,
      (SELECT count(*) FROM relic_messaging.order_links WHERE store_id=$1) AS order_drafts,
      (SELECT count(*) FROM relic_messaging.outbound_messages WHERE store_id=$1) AS outbound,
      (SELECT count(*) FROM relic_messaging.processed_events) AS processed_events,
      (SELECT count(*) FROM public.orders WHERE store_id=$1 AND status='pendiente') AS unpaid_orders`, [storeId]);
    const row = evidence.rows[0];
    expect(Number(row.conversations)).toBe(1);
    expect(Number(row.carts), JSON.stringify(row)).toBe(1);
    expect(Number(row.order_drafts)).toBe(1);
    expect(Number(row.unpaid_orders)).toBe(1);
    expect(Number(row.processed_events)).toBe(6);
    expect(Number(row.outbound)).toBeGreaterThanOrEqual(6);
    expect(fakeMeta.messages.length).toBeGreaterThanOrEqual(6);

    const order = await pool.query(`SELECT o.id, o.total, oi.quantity, oi.unit_price, l.store_id
      FROM public.orders o JOIN public.order_items oi ON oi.order_id=o.id
      JOIN relic_messaging.order_links l ON l.order_id=o.id WHERE o.store_id=$1`, [storeId]);
    expect(order.rows).toHaveLength(1);
    expect(Number(order.rows[0].quantity)).toBe(2);
    expect(Number(order.rows[0].unit_price)).toBe(499);
    expect(Number(order.rows[0].total)).toBe(998);
    expect(order.rows[0].store_id).toBe(storeId);
  });

  it('does not create a second order on duplicate confirmation', async () => {
    const before = await pool.query(`SELECT count(*)::int AS count FROM public.orders WHERE store_id=$1`, [storeId]);
    const duplicate = await post('dm-006', 'confirmo');
    expect(duplicate.status).toBe(200);
    const after = await pool.query(`SELECT count(*)::int AS count FROM public.orders WHERE store_id=$1`, [storeId]);
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it('coalesces concurrent confirmations from distinct events by the durable cart key', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime();
    for (const [id, text] of [['c-001', 'tienes la playera negra en M?'], ['c-002', 'quiero dos'], ['c-003', 'envío'], ['c-004', 'transferencia'], ['c-005', 'mis datos son sintéticos']] as const) {
      expect((await post(id, text)).status).toBe(200);
    }
    const results = await Promise.all([post('confirm-a', 'confirmo'), post('confirm-b', 'confirmo')]);
    expect(results.every(result => result.status === 200), JSON.stringify(results.map(result => ({ status: result.status, body: result.body })))).toBe(true);
    const count = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(count.rows[0].count).toBe(1);
  });

  it('claims one PostgreSQL outbound row across two workers and never resends SENT', async () => {
    await pool.query('TRUNCATE relic_messaging.outbound_messages RESTART IDENTITY CASCADE');
    const message: NormalizedOutboundMessage = { idempotencyKey: 'pg-worker-concurrency', correlationId: 'pg-worker', conversationId: 'pg-conversation', recipientId: 'test_customer_black_relic', channel: 'instagram', kind: 'text', text: 'synthetic outbound', replyToMessageId: 'pg-inbound' };
    const client = await pool.connect();
    try {
      await client.query('INSERT INTO relic_messaging.outbound_messages (id,store_id,channel,conversation_id,external_recipient_id,related_inbound_event_id,payload,payload_fingerprint,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', ['pg-worker-row', storeId, message.channel, message.conversationId, message.recipientId, message.replyToMessageId, JSON.stringify(message), 'pg-worker-fingerprint', 'QUEUED']);
    } finally { client.release(); }
    const calls: NormalizedOutboundMessage[] = [];
    const provider: MetaOutboundProvider = { send: async item => { calls.push(item); return { status: 'SENT', externalMessageId: 'pg-provider-message' }; } };
    const clients = await Promise.all([pool.connect(), pool.connect()]);
    try {
      const results = await Promise.all(clients.map(client => new DurableOutboundWorker(new PostgresOutboundDeliveryRepository(client, storeId), provider, { batchSize: 1 }).runBatch()));
      expect(results.reduce((sum, result) => sum + result.sent, 0)).toBe(1);
      expect(calls).toHaveLength(1);
    } finally { clients.forEach(client => client.release()); }
    const row = await pool.query('SELECT status,provider_message_id,sent_at,attempt_count FROM relic_messaging.outbound_messages WHERE id=$1', ['pg-worker-row']);
    expect(row.rows[0].status).toBe('SENT');
    expect(row.rows[0].provider_message_id).toBe('pg-provider-message');
    expect(row.rows[0].sent_at).toBeTruthy();
    expect(Number(row.rows[0].attempt_count)).toBe(1);
  });

  it('recovers the commercial conversation across fresh runtimes and reads order status after restart', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime(new FakeGoogleProvider(0));
    expect((await post('r-001', 'tienes la playera negra en M?')).status).toBe(200);
    expect((await post('r-002', 'quiero dos')).status).toBe(200);
    const persisted = await pool.query(`SELECT count(*)::int AS conversations, (SELECT count(*) FROM relic_messaging.carts) AS carts FROM relic_messaging.conversations`);
    expect(persisted.rows[0].conversations).toBe(1);
    expect(Number(persisted.rows[0].carts)).toBe(1);

    mountRuntime(new FakeGoogleProvider(2));
    expect((await post('r-003', 'envío')).status).toBe(200);
    expect((await post('r-004', 'transferencia')).status).toBe(200);
    expect((await post('r-005', 'mis datos son sintéticos')).status).toBe(200);
    expect((await post('r-006', 'confirmo')).status).toBe(200);
    const order = await pool.query('SELECT id FROM public.orders WHERE store_id=$1 AND status=\'pendiente\'', [storeId]);
    expect(order.rows).toHaveLength(1);

    mountRuntime(new FakeGoogleProvider(6, order.rows[0].id));
    const statusResponse = await post('r-007', 'donde esta mi pedido?');
    expect(statusResponse.status, JSON.stringify(statusResponse.body)).toBe(200);
    const status = await pool.query('SELECT count(*)::int AS count FROM public.orders WHERE id=$1', [order.rows[0].id]);
    expect(status.rows[0].count).toBe(1);
  });

  it('fails closed when stock is exhausted before confirmation', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime();
    for (const [id, text] of [['s-001', 'tienes la playera negra en M?'], ['s-002', 'quiero dos'], ['s-003', 'envío'], ['s-004', 'transferencia'], ['s-005', 'mis datos son sintéticos']] as const) expect((await post(id, text)).status).toBe(200);
    await pool.query("UPDATE public.products SET stock=0, variants=jsonb_set(variants, '{0,stock}', '0'::jsonb) WHERE id=$1", [productId]);
    expect([200, 503]).toContain((await post('s-006', 'confirmo')).status);
    const result = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(result.rows[0].count).toBe(0);
  });

  it('requires reconfirmation when price changes before confirmation', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime();
    for (const [id, text] of [['p-001', 'tienes la playera negra en M?'], ['p-002', 'quiero dos'], ['p-003', 'envío'], ['p-004', 'transferencia'], ['p-005', 'mis datos son sintéticos']] as const) expect((await post(id, text)).status).toBe(200);
    await pool.query("UPDATE public.products SET price=599, variants=jsonb_set(variants, '{0,price}', '599'::jsonb) WHERE id=$1", [productId]);
    expect((await post('p-006', 'confirmo')).status).toBe(200);
    const first = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(first.rows[0].count).toBe(0);
    expect((await post('p-007', 'confirmo')).status).toBe(200);
    const second = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(second.rows[0].count).toBe(1);
  });

  it('keeps the order durable when outbound delivery fails and recovers it by worker retry', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime();
    for (const [id, text] of [['o-001', 'tienes la playera negra en M?'], ['o-002', 'quiero dos'], ['o-003', 'envío'], ['o-004', 'transferencia'], ['o-005', 'mis datos son sintéticos']] as const) expect((await post(id, text)).status).toBe(200);
    mountRuntime(new FakeGoogleProvider(5), null as any);
    expect((await post('o-006', 'confirmo')).status).toBe(200);
    const before = await pool.query('SELECT count(*)::int AS orders FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    const failureClient = await pool.connect();
    try { await new DurableOutboundWorker(new PostgresOutboundDeliveryRepository(failureClient, storeId), new RetryableMetaProvider(), { batchSize: 1 }).runBatch(); }
    finally { failureClient.release(); }
    const pending = await pool.query("SELECT count(*)::int AS count FROM relic_messaging.outbound_messages WHERE store_id=$1 AND status='RETRYABLE_FAILURE'", [storeId]);
    expect(before.rows[0].orders).toBe(1);
    expect(pending.rows[0].count).toBeGreaterThan(0);
    const successProvider: MetaOutboundProvider = { send: async message => ({ status: 'SENT', externalMessageId: `recovered-${message.idempotencyKey}` }) };
    const client = await pool.connect();
    try { await new DurableOutboundWorker(new PostgresOutboundDeliveryRepository(client, storeId), successProvider).runBatch(); }
    finally { client.release(); }
    const after = await pool.query("SELECT count(*)::int AS count FROM relic_messaging.outbound_messages WHERE store_id=$1 AND status='SENT'", [storeId]);
    const orders = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(after.rows[0].count).toBeGreaterThan(0);
    expect(orders.rows[0].count).toBe(1);
  });

  it('fails closed when the selected variant becomes unavailable before confirmation', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime();
    for (const [id, text] of [['v-001', 'tienes la playera negra en M?'], ['v-002', 'quiero dos'], ['v-003', 'envío'], ['v-004', 'transferencia'], ['v-005', 'mis datos son sintéticos']] as const) expect((await post(id, text)).status).toBe(200);
    await pool.query("UPDATE public.products SET variants='[]'::jsonb WHERE id=$1", [productId]);
    expect([200, 503]).toContain((await post('v-006', 'confirmo')).status);
    const orders = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(orders.rows[0].count).toBe(0);
  });

  it('fails closed on a controlled database error during order creation', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime();
    for (const [id, text] of [['d-001', 'tienes la playera negra en M?'], ['d-002', 'quiero dos'], ['d-003', 'envío'], ['d-004', 'transferencia'], ['d-005', 'mis datos son sintéticos']] as const) expect((await post(id, text)).status).toBe(200);
    const createOrderDraft = vi.spyOn(PostgresCommerceAdapter.prototype, 'createOrderDraft').mockRejectedValueOnce(new Error('SYNTHETIC_DB_FAILURE'));
    try { expect([200, 503]).toContain((await post('d-006', 'confirmo')).status); }
    finally { createOrderDraft.mockRestore(); }
    const orders = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(orders.rows[0].count).toBe(0);
  });

  it('recovers a post-commit retry in a fresh runtime without a second order or outbound', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider(); mountRuntime();
    for (const [id, text] of [['rty-001', 'tienes la playera negra en M?'], ['rty-002', 'quiero dos'], ['rty-003', 'envío'], ['rty-004', 'transferencia'], ['rty-005', 'mis datos son sintéticos']] as const) expect((await post(id, text)).status).toBe(200);
    const priorOutbound = await pool.query('SELECT id FROM relic_messaging.outbound_messages WHERE store_id=$1', [storeId]);
    const retryTimestamp = Date.now();
    mountRuntime(new FakeGoogleProvider(5), null as any);
    expect((await post('rty-006', 'confirmo', retryTimestamp)).status).toBe(200);
    const first = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(first.rows[0].count).toBe(1);
    const recoveryCalls: NormalizedOutboundMessage[] = [];
    mountRuntime(new FakeGoogleProvider(5), null as any);
    const retryResponse = await post('rty-006', 'confirmo', retryTimestamp);
    expect(retryResponse.status, JSON.stringify(retryResponse.body)).toBe(200);
    const confirmationRow = await pool.query('SELECT id,status FROM relic_messaging.outbound_messages WHERE store_id=$1 AND NOT (id = ANY($2::text[]))', [storeId, priorOutbound.rows.map(row => row.id)]);
    expect(confirmationRow.rows).toHaveLength(1);
    expect(confirmationRow.rows[0].status).toBe('QUEUED');
    const recoveryClient = await pool.connect();
    try { await new DurableOutboundWorker(new PostgresOutboundDeliveryRepository(recoveryClient, storeId), { send: async message => { recoveryCalls.push(message); return { status: 'SENT', externalMessageId: `recovered-${message.idempotencyKey}` }; } }).runBatch(); }
    finally { recoveryClient.release(); }
    const second = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    const confirmOutbound = await pool.query('SELECT status,attempt_count,provider_message_id FROM relic_messaging.outbound_messages WHERE id=$1', [confirmationRow.rows[0].id]);
    expect(second.rows[0].count).toBe(1);
    expect(confirmOutbound.rows[0].status).toBe('SENT');
    expect(Number(confirmOutbound.rows[0].attempt_count)).toBe(1);
    expect(confirmOutbound.rows[0].provider_message_id).toBeTruthy();
    expect(recoveryCalls.length).toBe(1);
  });

  it('does not create an order without complete customer context', async () => {
    await resetDatabase(); fakeMeta = new FakeMetaProvider();
    const runtime = createBlackRelicSalesRuntime({ pool, storeId, appSecret, verifyToken, providerMode: 'mock', provider: new FakeGoogleProvider(5), outboundProvider: fakeMeta,
      identityContext: { selectedProductId: productId, selectedVariantName: 'M / negro', paymentMethod: 'transfer', customerName: 'Synthetic Customer' } });
    app = express(); app.use('/api/webhooks/meta', createMessagingRouter(runtime.webhookConfig, runtime.pipeline));
    expect((await post('c-001', 'confirmo')).status).toBe(200);
    const orders = await pool.query('SELECT count(*)::int AS count FROM relic_messaging.order_links WHERE store_id=$1', [storeId]);
    expect(orders.rows[0].count).toBe(0);
  });
});
