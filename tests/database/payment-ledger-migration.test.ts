// @vitest-environment node
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const sql = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const migration = sql('supabase/migrations/20260928000002_create_order_payments_ledger.sql');
const inventory = sql('supabase/migrations/20260928000001_create_sellable_units.sql');
const backfill = sql('scripts/database/backfill-order-payments.sql');
const baseline = sql('supabase/migrations/20260918004527_remote_schema.sql');
const connectionString = process.env.CCP13_LOCAL_DATABASE_URL;

// Explicit disposable local database only; never load dotenv or DATABASE_URL.
function verifiedLocalTarget(value: string) {
  const target = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || !/^\/ccp13_test_[a-z0-9_]+$/.test(target.pathname) || target.search || target.hash) {
    throw new Error('CCP13_LOCAL_DATABASE_URL must target an isolated loopback ccp13_test_<suffix> database without URL options');
  }
  return target;
}
describe('CCP-13 local database safety', () => {
  it.each(['postgres://example.com/ccp13_test_a','postgres://localhost/postgres',
    'postgres://localhost/ccp13_test_a?host=remote','https://localhost/ccp13_test_a'])('rejects unsafe target %s', value => {
    expect(() => verifiedLocalTarget(value)).toThrow('isolated loopback');
  });
  it('accepts an explicitly isolated local target', () => {
    expect(verifiedLocalTarget('postgres://127.0.0.1:54322/ccp13_test_ledger').hostname).toBe('127.0.0.1');
  });
});

describe.skipIf(!connectionString)('CCP-13 real PostgreSQL integration (NOT RUN without CCP13_LOCAL_DATABASE_URL)', () => {
  let pool: Pool;
  let initialized = false;
  const admin = randomUUID(), customer = randomUUID(), stranger = randomUUID();
  const product = randomUUID(), unit = randomUUID();
  const snapshot = { productName: 'Serum', unitTitle: '50ml', sku: 'SERUM-50', attributes: { size: '50ml' }, originalPrice: 100, settledPrice: 100 };
  async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async function roleQuery(role: 'anon' | 'authenticated' | 'service_role', query: string, params: unknown[] = [], actor = customer) {
    return transaction(async client => {
      await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [actor]);
      return client.query(query, params);
    });
  }
  async function web(status = 'pagado', total = 100, refund = 0) {
    const id = randomUUID();
    await pool.query('INSERT INTO public.orders(id,customer_user_id,status,total,subtotal,refunded_amount) VALUES($1,$2,$3,$4,$4,$5)', [id,customer,status,total,refund]);
    return id;
  }
  async function payment(order: string, overrides: Record<string, unknown> = {}, client: Pool | PoolClient = pool) {
    const p = { order_id: order, payment_channel: 'stripe', amount: 100, currency: 'mxn', status: 'captured', idempotency_key: randomUUID(), tender_details: {}, ...overrides };
    const columns = Object.keys(p);
    // Identifiers originate only in these test fixtures, never external input.
    return client.query(`INSERT INTO public.order_payments(${columns.join(',')}) VALUES(${columns.map((_, i) => `$${i+1}`).join(',')}) RETURNING *`, columns.map(column => { const value = p[column as keyof typeof p]; return column === 'tender_details' && value !== null ? JSON.stringify(value) : value; }));
  }
  async function pos(channel = 'cash', request = randomUUID(), options: { amount?: number; item?: Record<string, unknown>; pay?: Record<string, unknown> } = {}) {
    const id = randomUUID();
    await transaction(async client => {
      await client.query("INSERT INTO public.orders(id,channel,client_request_id,cashier_user_id,total,subtotal,status) VALUES($1,'pos_register',$2,$3,100,100,'pendiente')", [id,request,admin]);
      const item = { order_id: id, product_id: product, sellable_unit_id: unit, sku: 'SERUM-50', quantity: 1, unit_price: 100, total_price: 100, product_snapshot: snapshot, ...options.item };
      const columns = Object.keys(item);
      await client.query(`INSERT INTO public.order_items(${columns.join(',')}) VALUES(${columns.map((_, i) => `$${i+1}`).join(',')})`, Object.values(item));
      await payment(id, { payment_channel: channel, amount: options.amount ?? 100,
        reference_code: channel === 'card_reference' ? 'AUTH-984210' : null,
        tender_details: channel === 'card_reference' ? { tenderType: channel, referenceCode: 'AUTH-984210', last4: '4242' }
          : { tenderType: channel, amountTendered: 150, changeGiven: 50 }, ...options.pay }, client);
      await client.query("UPDATE public.orders SET status='pagado' WHERE id=$1", [id]);
    });
    return id;
  }
  async function runBackfill() {
    const client = await pool.connect();
    try { return await client.query(backfill); }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  const reconciled = async (id: string) => (await pool.query('SELECT * FROM public.verify_order_payment_reconciliation($1)', [id])).rows[0];
  beforeAll(async () => {
    const target = verifiedLocalTarget(connectionString!);
    pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
    const identity = (await pool.query("SELECT current_database() name,to_regprocedure('auth.uid()') auth_uid")).rows[0];
    expect(identity.name).toBe(target.pathname.slice(1));
    expect(identity.auth_uid).not.toBeNull();
    expect((await pool.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')")).rowCount).toBe(3);
    expect((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows, 'Refuse to mutate nonempty database').toEqual([]);
    for (const table of ['users','products','orders','order_items','inventory_movements']) {
      const definition = baseline.match(new RegExp(`CREATE TABLE "public"\\."${table}" \\([\\s\\S]*?\\n\\);`));
      expect(definition, table).not.toBeNull();
      await pool.query(definition![0].replaceAll('extensions.uuid_generate_v4()', 'gen_random_uuid()'));
    }
    initialized = true;
    await pool.query(`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.order_items ADD FOREIGN KEY(order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
      ALTER TABLE public.order_items ADD FOREIGN KEY(product_id) REFERENCES public.products(id) ON DELETE SET NULL;`);
    await pool.query(inventory);
    // Legacy rows predate CCP-13 and have neither canonical linkage nor snapshot.
    await pool.query("INSERT INTO public.orders(status,total,subtotal) VALUES('pagado',100,100)");
    await pool.query("INSERT INTO public.order_items(order_id,unit_price,product_snapshot) SELECT id,100,'{\"name\":\"Legacy\"}' FROM public.orders");
    await pool.query(migration);
    expect((await pool.query('SELECT sellable_unit_id,total_price FROM public.order_items')).rows[0]).toEqual({ sellable_unit_id: null, total_price: null });
  }, 30000);
  beforeEach(async () => {
    await pool.query('TRUNCATE public.order_payments,public.order_items,public.inventory_movements,public.sellable_units,public.orders,public.users,public.products CASCADE');
    await pool.query("INSERT INTO public.users(id,email,role) VALUES($1,'admin@test.local','admin'),($2,'customer@test.local','user'),($3,'stranger@test.local','user')", [admin,customer,stranger]);
    await pool.query("INSERT INTO public.products(id,name,sku,stock) VALUES($1,'Serum','SERUM',0)", [product]);
    await pool.query("INSERT INTO public.sellable_units(id,product_id,sku,title) VALUES($1,$2,'SERUM-50','50ml')", [unit,product]);
  });
  afterAll(async () => {
    if (pool) {
      if (initialized) {
        // This database was verified empty and is dedicated to this suite.
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role');
      }
      await pool.end();
    }
  });
  it('applies repeatably with RLS, strict channels and unique order request/receipt identifiers', async () => {
    const id = await pos();
    const before = (await pool.query('SELECT * FROM public.order_payments')).rows;
    await pool.query(migration);
    expect((await pool.query('SELECT * FROM public.order_payments')).rows).toEqual(before);
    expect((await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.order_payments'::regclass")).rows[0].relrowsecurity).toBe(true);
    const request = (await pool.query('SELECT client_request_id FROM public.orders WHERE id=$1',[id])).rows[0].client_request_id;
    await expect(pos('cash',request)).rejects.toMatchObject({ code: '23505' });
    await pool.query("INSERT INTO public.orders(receipt_number) VALUES('R-1')");
    await expect(pool.query("INSERT INTO public.orders(receipt_number) VALUES('R-1')")).rejects.toMatchObject({ code: '23505' });
    await expect(pool.query("INSERT INTO public.orders(channel) VALUES('unknown')")).rejects.toMatchObject({ code: '23514' });
  });
  it.each(['cash','card_reference'])('records %s without Stripe identifiers', async channel => {
    const id = await pos(channel);
    expect((await reconciled(id)).is_balanced).toBe(true);
    expect((await pool.query('SELECT stripe_session_id,stripe_payment_intent_id FROM public.orders WHERE id=$1',[id])).rows[0]).toEqual({ stripe_session_id: null, stripe_payment_intent_id: null });
  });
  it('enforces unique payment retries under contention and permits 1:N split ledger rows', async () => {
    const id = await web(); const key = randomUUID();
    const results = await Promise.allSettled([payment(id,{ amount: 50,idempotency_key: key }),payment(id,{ amount: 50,idempotency_key: key })]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: '23505' } });
    await payment(id,{ amount: 50 });
    expect(await reconciled(id)).toMatchObject({ captured_total: '100.00',is_balanced: true,discrepancy: '0.00' });
  });
  it.each([
    { payment_channel: 'fake' }, { amount: 0 }, { amount: -1 }, { amount: 'NaN' },
    { currency: 'eur' }, { status: 'unknown' }, { idempotency_key: '' }, { idempotency_key: ' padded ' },
    { refunded_amount: 101 }, { refunded_amount: -1 }, { refunded_amount: 'NaN' },
    { status: 'partially_refunded',refunded_amount: 0 }, { status: 'refunded',refunded_amount: 50 },
    { tender_details: [] }, { tender_details: null },
  ])('rejects invalid ledger fields %j', async fields => {
    const id = await web();
    await expect(payment(id,fields)).rejects.toThrow();
    expect((await pool.query('SELECT * FROM public.order_payments')).rowCount).toBe(0);
  });
  it.each([
    { tender_details: {} },
    { tender_details: { tenderType: 'cash',amountTendered: 99,changeGiven: 0 } },
    { tender_details: { tenderType: 'cash',amountTendered: 150,changeGiven: 49 } },
    { tender_details: { tenderType: 'cash',amountTendered: 150,changeGiven: 50,stripePaymentIntentId: 'pi_cash_fake' } },
    { reference_code: 'pi_cash_fake' },
  ])('rejects invalid cash metadata %j', async pay => {
    await expect(pos('cash',randomUUID(),{ pay })).rejects.toThrow();
    expect((await pool.query('SELECT * FROM public.orders')).rowCount).toBe(0);
  });
  it.each([{ reference_code: null },{ reference_code: ' A123 ' },{ reference_code: 'abc' },
    { tender_details: { tenderType: 'card_reference',referenceCode: 'OTHER' } }])('rejects invalid card evidence %j', async pay => {
    await expect(pos('card_reference',randomUUID(),{ pay })).rejects.toThrow();
  });
  it.each(['----','---A','A-B-C'])('rejects card reference with fewer than four alphanumeric characters: %s', async reference => {
    await expect(pos('card_reference',randomUUID(),{ pay: {
      reference_code: reference,tender_details: { tenderType: 'card_reference',referenceCode: reference },
    } })).rejects.toMatchObject({ code: '23514',constraint: 'chk_card_reference' });
    expect((await pool.query('SELECT * FROM public.orders')).rowCount).toBe(0);
  });
  it.each(['AB12','A-B-1-2','----AB12'])('accepts the four-alphanumeric boundary: %s', async reference => {
    const id = await pos('card_reference',randomUUID(),{ pay: {
      reference_code: reference,tender_details: { tenderType: 'card_reference',referenceCode: reference },
    } });
    expect((await reconciled(id)).is_balanced).toBe(true);
  });
  it('rejects currency mismatch and non-Stripe web payments', async () => {
    const id = await web();
    await expect(payment(id,{ currency: 'usd' })).rejects.toThrow('PAYMENT_CURRENCY_MISMATCH');
    await expect(payment(id,{ payment_channel: 'cash',tender_details: { tenderType: 'cash',amountTendered: 100,changeGiven: 0 } })).rejects.toThrow('NON_STRIPE_PAYMENT_REQUIRES_POS_ORDER');
  });
  it('enforces customer ownership, guest privacy, staff access and anonymous denial with baseline RLS intact', async () => {
    const own = await web(), other = await web(), guest = await web();
    await pool.query('UPDATE public.orders SET customer_user_id=$2 WHERE id=$1',[other,stranger]);
    await pool.query('UPDATE public.orders SET customer_user_id=NULL,customer_email=NULL WHERE id=$1',[guest]);
    for (const id of [own,other,guest]) await payment(id);
    expect((await roleQuery('authenticated','SELECT order_id FROM public.order_payments')).rows).toEqual([{ order_id: own }]);
    expect((await roleQuery('authenticated','SELECT order_id FROM public.order_payments',[],admin)).rowCount).toBe(3);
    await roleQuery('authenticated',"INSERT INTO public.order_payments(order_id,payment_channel,amount,idempotency_key) VALUES($1,'stripe',1,$2)",[own,randomUUID()],admin);
    await expect(roleQuery('authenticated',"INSERT INTO public.order_payments(order_id,payment_channel,amount,idempotency_key) VALUES($1,'stripe',1,$2)",[own,randomUUID()])).rejects.toThrow('row-level security');
    expect((await roleQuery('authenticated',"UPDATE public.order_payments SET status='failed' WHERE order_id=$1",[other])).rowCount).toBe(0);
    expect((await roleQuery('authenticated','DELETE FROM public.order_payments WHERE order_id=$1',[other])).rowCount).toBe(0);
    await expect(roleQuery('anon','SELECT * FROM public.order_payments')).rejects.toThrow('permission denied');
    await expect(roleQuery('anon',"INSERT INTO public.order_payments(order_id,payment_channel,amount,idempotency_key) VALUES($1,'stripe',1,$2)",[own,randomUUID()])).rejects.toThrow('permission denied');
    await pool.query("UPDATE public.users SET role='owner' WHERE id=$1",[admin]);
    expect((await roleQuery('authenticated','SELECT * FROM public.order_payments',[],admin)).rowCount).toBe(4);
    for (const role of ['anon','authenticated'] as const) {
      await expect(roleQuery(role,'SELECT * FROM public.verify_order_payment_reconciliation($1)',[other],admin)).rejects.toThrow('permission denied');
    }
    expect((await roleQuery('service_role','SELECT * FROM public.verify_order_payment_reconciliation($1)',[other])).rows[0].is_balanced).toBe(true);
  });
  it('requires POS staff, request id and valid order arithmetic without removing legacy statuses', async () => {
    for (const cashier of [customer, null]) {
      await expect(pool.query("INSERT INTO public.orders(channel,client_request_id,cashier_user_id) VALUES('pos_register',$1,$2)",[randomUUID(),cashier])).rejects.toThrow('POS_REQUIRES_REQUEST_ID_AND_STAFF_CASHIER');
    }
    await expect(pool.query("INSERT INTO public.orders(channel,cashier_user_id) VALUES('pos_register',$1)",[admin])).rejects.toThrow('POS_REQUIRES_REQUEST_ID_AND_STAFF_CASHIER');
    await expect(pool.query("INSERT INTO public.orders(channel,client_request_id,cashier_user_id,total) VALUES('pos_register',$1,$2,100)",[randomUUID(),admin])).rejects.toThrow('INVALID_ORDER_FINANCIAL_TOTAL');
    for (const status of ['pendiente','inventory_exception','pagado','partially_refunded','refunded']) await web(status);
  });
  it.each([{ sellable_unit_id: null },{ sellable_unit_id: randomUUID() },{ product_id: randomUUID() },
    { sku: 'WRONG' },{ product_snapshot: {} },{ product_snapshot: null },{ total_price: 99 },
    { product_snapshot: { ...snapshot,settledPrice: 99 } },{ product_snapshot: { ...snapshot,attributes: null } }])('enforces exact SKU linkage and financial snapshots %j', async item => {
    await expect(pos('cash',randomUUID(),{ item })).rejects.toThrow();
    expect((await pool.query('SELECT * FROM public.orders')).rowCount).toBe(0);
  });
  it('freezes sale financial values, items and original tender while allowing fulfillment and refunds', async () => {
    const id = await pos();
    await expect(pool.query('UPDATE public.orders SET total=101 WHERE id=$1',[id])).rejects.toThrow('ORDER_SALE_EVIDENCE_IMMUTABLE');
    await expect(pool.query('UPDATE public.order_items SET product_snapshot=$2 WHERE order_id=$1',[id,{}])).rejects.toThrow('ORDER_ITEM_SNAPSHOT_IMMUTABLE');
    await expect(pool.query('DELETE FROM public.order_items WHERE order_id=$1',[id])).rejects.toThrow('ORDER_ITEM_SNAPSHOT_IMMUTABLE');
    await expect(pool.query('DELETE FROM public.sellable_units WHERE id=$1',[unit])).rejects.toMatchObject({ code: '23503' });
    await expect(pool.query('UPDATE public.order_payments SET amount=101 WHERE order_id=$1',[id])).rejects.toThrow('PAYMENT_SALE_EVIDENCE_IMMUTABLE');
    await expect(pool.query('DELETE FROM public.orders WHERE id=$1',[id])).rejects.toThrow(/PAYMENT_LEDGER_IMMUTABLE|ORDER_ITEM_SNAPSHOT_IMMUTABLE/);
    await pool.query("UPDATE public.users SET role='user' WHERE id=$1",[admin]);
    await pool.query("UPDATE public.orders SET status='empacado' WHERE id=$1",[id]);
    await pool.query("UPDATE public.order_payments SET status='partially_refunded',refunded_amount=20 WHERE order_id=$1",[id]);
    expect((await reconciled(id)).is_balanced).toBe(false);
    await pool.query("UPDATE public.orders SET status='partially_refunded',refunded_amount=20 WHERE id=$1",[id]);
    expect((await reconciled(id)).is_balanced).toBe(true);
    await expect(pool.query("UPDATE public.order_payments SET status='captured',refunded_amount=0 WHERE order_id=$1",[id])).rejects.toThrow('INVALID_PAYMENT_TRANSITION');
  });
  async function insertCanonicalItem(order: string, price = 0, client: Pool | PoolClient = pool) {
    return client.query(`INSERT INTO public.order_items(order_id,product_id,sellable_unit_id,sku,unit_price,total_price,product_snapshot)
      VALUES($1,$2,$3,'SERUM-50',$4,$4,$5)`, [order,product,unit,price,JSON.stringify({ ...snapshot,settledPrice: price })]);
  }
  it.each(['pagado','empacado','enviado','entregado','inventory_exception','partially_refunded','refunded'])
  ('blocks zero-price and priced canonical additions to settled state %s without relying on a ledger row', async status => {
    const id = await web(status);
    for (const price of [0,100]) await expect(insertCanonicalItem(id,price)).rejects.toThrow('ORDER_ITEM_SET_SETTLED_IMMUTABLE');
    expect((await pool.query('SELECT * FROM public.order_items WHERE order_id=$1',[id])).rowCount).toBe(0);
  });
  it('blocks additional POS items after capture, including zero-price lines and after changing order status', async () => {
    const id = await pos();
    for (const price of [0,100]) await expect(insertCanonicalItem(id,price)).rejects.toThrow('ORDER_ITEM_SET_SETTLED_IMMUTABLE');
    await pool.query("UPDATE public.orders SET status='pendiente' WHERE id=$1",[id]);
    await expect(insertCanonicalItem(id)).rejects.toThrow('ORDER_ITEM_SET_SETTLED_IMMUTABLE');
    expect((await pool.query('SELECT * FROM public.order_items WHERE order_id=$1',[id])).rowCount).toBe(1);
  });
  it('does not permit unlinked zero-price additions to a settled canonical web order', async () => {
    const id = await web('pendiente');
    await insertCanonicalItem(id,100);
    await payment(id);
    await pool.query("UPDATE public.orders SET status='pagado' WHERE id=$1",[id]);
    await expect(pool.query('INSERT INTO public.order_items(order_id,unit_price) VALUES($1,0)',[id])).rejects.toThrow('ORDER_ITEM_SET_SETTLED_IMMUTABLE');
    expect((await pool.query('SELECT * FROM public.order_items WHERE order_id=$1',[id])).rowCount).toBe(1);
  });
  it('allows multi-item POS construction before settlement, then freezes the item set', async () => {
    const id = randomUUID();
    await transaction(async client => {
      await client.query("INSERT INTO public.orders(id,channel,client_request_id,cashier_user_id,total,subtotal,status) VALUES($1,'pos_register',$2,$3,100,100,'pendiente')",[id,randomUUID(),admin]);
      await insertCanonicalItem(id,100,client);
      await insertCanonicalItem(id,0,client);
      await payment(id,{ payment_channel: 'cash',tender_details: { tenderType: 'cash',amountTendered: 100,changeGiven: 0 } },client);
      await client.query("UPDATE public.orders SET status='pagado' WHERE id=$1",[id]);
    });
    expect((await pool.query('SELECT * FROM public.order_items WHERE order_id=$1',[id])).rowCount).toBe(2);
    expect((await reconciled(id)).is_balanced).toBe(true);
    await expect(insertCanonicalItem(id)).rejects.toThrow('ORDER_ITEM_SET_SETTLED_IMMUTABLE');
  });
  it('checks POS payment and item totals at commit and rolls back incomplete sales', async () => {
    await expect(pool.query("INSERT INTO public.orders(channel,client_request_id,cashier_user_id,status) VALUES('pos_register',$1,$2,'pagado')",[randomUUID(),admin])).rejects.toThrow('ORDER_ITEM_SUBTOTAL_MISMATCH');
    await expect(pos('cash',randomUUID(),{ amount: 99,pay: { tender_details: { tenderType: 'cash',amountTendered: 99,changeGiven: 0 } } })).rejects.toThrow('ORDER_PAYMENT_NOT_CAPTURED');
    await expect(pos('cash',randomUUID(),{ item: { quantity: 2,total_price: 200 } })).rejects.toThrow('ORDER_ITEM_SUBTOTAL_MISMATCH');
    expect((await pool.query('SELECT * FROM public.orders')).rowCount).toBe(0);
  });
  it('reports exact discrepancies, excludes pending/failed and reconciles full refunds against gross principal', async () => {
    const id = await web();
    for (const status of ['pending','failed']) await payment(id,{ status });
    expect(await reconciled(id)).toMatchObject({ captured_total: '0.00',is_balanced: false,discrepancy: '-100.00' });
    await payment(id,{ amount: 101 });
    expect(await reconciled(id)).toMatchObject({ is_balanced: false,discrepancy: '1.00' });
    const refunded = await web('refunded',100,100);
    await payment(refunded,{ status: 'refunded',refunded_amount: 100 });
    expect(await reconciled(refunded)).toMatchObject({ captured_total: '100.00',is_balanced: true });
    expect(await reconciled(randomUUID())).toBeUndefined();
  });
  it('backfills all historical paid states, guests and partial/full refunds repeatably without fake IDs', async () => {
    const ids = [];
    for (const status of ['pagado','empacado','enviado','entregado','partially_refunded','refunded','inventory_exception']) {
      ids.push(await web(status,100,status === 'refunded' ? 100 : status === 'partially_refunded' ? 25 : 0));
    }
    await pool.query('UPDATE public.orders SET customer_user_id=NULL,customer_email=NULL WHERE id=$1',[ids[0]]);
    await pool.query("UPDATE public.orders SET stripe_session_id='cs_test_verified',stripe_payment_intent_id='pi_verified' WHERE id=$1",[ids[1]]);
    await web('pendiente'); await web('cancelado');
    await runBackfill();
    const rows = (await pool.query('SELECT * FROM public.order_payments ORDER BY order_id')).rows;
    expect(rows).toHaveLength(7);
    for (const id of ids) expect((await reconciled(id)).is_balanced).toBe(true);
    expect(rows.find(p => p.order_id === ids[0])).toMatchObject({ reference_code: null,tender_details: { tenderType: 'stripe',historicalBackfill: true } });
    expect(rows.find(p => p.order_id === ids[1])).toMatchObject({ reference_code: 'pi_verified' });
    expect(rows.find(p => p.order_id === ids[4])).toMatchObject({ status: 'partially_refunded',refunded_amount: '25.00' });
    expect(rows.find(p => p.order_id === ids[6])).toMatchObject({ status: 'captured',amount: '100.00' });
    await runBackfill();
    expect((await pool.query('SELECT * FROM public.order_payments ORDER BY order_id')).rows).toEqual(rows);
    console.info('CCP-13 local PostgreSQL: 7/7 historical paid orders balanced, repeat preserved all ledger rows');
  });
  it.each([['partially_refunded',0],['partially_refunded',100],['refunded',0],['pagado',101]])('fails atomically for ambiguous historical refund %s/%i', async (status,refund) => {
    await web(); await web(status,100,refund);
    await expect(runBackfill()).rejects.toThrow('BACKFILL_REFUND_EVIDENCE_REQUIRED');
    expect((await pool.query('SELECT * FROM public.order_payments')).rowCount).toBe(0);
  });
  it('does not silently skip inventory_exception ledger discrepancies', async () => {
    const id = await web('inventory_exception');
    await payment(id,{ amount: 99 });
    expect(await reconciled(id)).toMatchObject({ is_balanced: false,discrepancy: '-1.00' });
    await expect(runBackfill()).rejects.toThrow('BACKFILL_EXISTING_LEDGER_MISMATCH');
    expect((await pool.query('SELECT amount FROM public.order_payments WHERE order_id=$1',[id])).rows).toEqual([{ amount: '99.00' }]);
  });
  it('preserves an existing balanced ledger and fails rather than overwriting mismatches', async () => {
    const id = await web(); await payment(id);
    const before = (await pool.query('SELECT * FROM public.order_payments')).rows;
    await runBackfill();
    expect((await pool.query('SELECT * FROM public.order_payments')).rows).toEqual(before);
    const other = await web(); await payment(other,{ amount: 99 });
    await expect(runBackfill()).rejects.toThrow('BACKFILL_EXISTING_LEDGER_MISMATCH');
    expect((await pool.query('SELECT * FROM public.order_payments')).rowCount).toBe(2);
  });
});
