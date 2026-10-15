// @vitest-environment node
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20260928000001_create_sellable_units.sql', import.meta.url), 'utf8');
const backfill = readFileSync(new URL('../../scripts/database/backfill-sellable-units.sql', import.meta.url), 'utf8');
const baseline = readFileSync(new URL('../../supabase/migrations/20260918004527_remote_schema.sql', import.meta.url), 'utf8');
const connectionString = process.env.CCP12_LOCAL_DATABASE_URL;

// Never use DATABASE_URL, SUPABASE_URL, dotenv, or remote credentials implicitly.
// Supply an EMPTY, disposable local Supabase-compatible database named
// ccp12_test_<suffix>, with auth.uid() and the standard API roles provisioned.
// npm test -- tests/database/inventory-migration.test.ts
function verifiedLocalTarget(value: string): URL {
  const target = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || !/^\/ccp12_test_[a-z0-9_]+$/.test(target.pathname)
    || target.search || target.hash) {
    throw new Error('CCP12_LOCAL_DATABASE_URL must target an isolated loopback ccp12_test_<suffix> database without URL options');
  }
  return target;
}

describe('CCP-12 local database safety', () => {
  it.each(['postgres://example.com/ccp12_test_a', 'postgres://localhost/postgres',
    'postgres://localhost/ccp12_test_a?host=remote', 'https://localhost/ccp12_test_a'])
  ('rejects unsafe database target %s before connection', (value) => {
    expect(() => verifiedLocalTarget(value)).toThrow('isolated loopback');
  });
  it('accepts an explicitly isolated local database', () => {
    expect(verifiedLocalTarget('postgres://127.0.0.1:54322/ccp12_test_inventory').hostname).toBe('127.0.0.1');
  });
});

describe.skipIf(!connectionString)('CCP-12 real PostgreSQL integration (NOT RUN without CCP12_LOCAL_DATABASE_URL)', () => {
  let pool: Pool;
  let initialized = false;
  const productId = randomUUID();
  const unitId = '00000000-0000-4000-8000-000000000001';
  const otherId = '00000000-0000-4000-8000-000000000002';
  const orderId = randomUUID();
  async function roleQuery(role: 'anon' | 'authenticated' | 'service_role', sql: string, params: unknown[] = [], actor?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${role}`);
      if (actor) await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [actor]);
      const result = await client.query(sql, params);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  async function decrement(items = [{ sellable_unit_id: unitId, quantity: 1 }], order = orderId) {
    return (await roleQuery('service_role', 'SELECT * FROM public.decrement_sellable_unit_stock($1::jsonb, $2::uuid)', [JSON.stringify(items), order])).rows[0];
  }
  async function stock(id = unitId) {
    return (await pool.query('SELECT stock FROM public.sellable_units WHERE id=$1', [id])).rows[0].stock;
  }
  async function movements(id = unitId) {
    return (await pool.query('SELECT * FROM public.inventory_movements WHERE sellable_unit_id=$1 ORDER BY created_at, id', [id])).rows;
  }
  async function seed(count = 3) {
    await pool.query('INSERT INTO public.products(id,name,sku,stock,status) VALUES($1, $2, $3, $4, $5)', [productId, 'Serum', 'SERUM', count, 'active']);
    await pool.query('INSERT INTO public.orders(id) VALUES($1)', [orderId]);
    await pool.query('INSERT INTO public.sellable_units(id,product_id,sku,title,stock) VALUES($1,$2,$3,$4,$5)', [unitId, productId, 'SERUM', 'Serum', count]);
  }
  beforeAll(async () => {
    const target = verifiedLocalTarget(connectionString!);
    pool = new Pool({ connectionString, max: 50, connectionTimeoutMillis: 5000 });
    const identity = await pool.query('SELECT current_database() name, to_regprocedure(\'auth.uid()\') auth_uid');
    expect(identity.rows[0].name).toBe(target.pathname.slice(1));
    expect(identity.rows[0].auth_uid, 'Local Supabase auth.uid() must already exist').not.toBeNull();
    const roles = await pool.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')");
    expect(roles.rowCount).toBe(3);
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    expect(tables.rows, 'Refuse to mutate a nonempty database').toEqual([]);
    // Use current committed compatible table definitions, not mocked RPC logic.
    for (const table of ['products', 'users', 'orders', 'inventory_movements']) {
      const definition = baseline.match(new RegExp(`CREATE TABLE "public"\\."${table}" \\([\\s\\S]*?\\n\\);`));
      expect(definition, `Baseline table ${table}`).not.toBeNull();
      await pool.query(definition![0].replaceAll('extensions.uuid_generate_v4()', 'gen_random_uuid()'));
    }
    initialized = true;
    await pool.query(`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.inventory_movements ADD FOREIGN KEY(product_id) REFERENCES public.products(id) ON DELETE SET NULL;
      ALTER TABLE public.inventory_movements ADD FOREIGN KEY(order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
      GRANT SELECT ON public.users TO authenticated;`);
    await pool.query(migration);
  }, 30000);
  beforeEach(async () => {
    await pool.query('TRUNCATE public.inventory_movements, public.sellable_units, public.products, public.orders, public.users CASCADE');
  });
  afterAll(async () => {
    if (pool) {
      if (initialized) {
        await pool.query(`DROP TABLE public.inventory_movements, public.sellable_units, public.products, public.orders, public.users CASCADE;
          DROP FUNCTION IF EXISTS public.decrement_sellable_unit_stock(jsonb,uuid,text,text),
            public.restock_sellable_unit(uuid,integer,uuid,text,text), public.is_sellable_unit_staff(),
            public.sync_parent_product_stock(), public.protect_sellable_unit_movement();`);
      }
      await pool.end();
    }
  });

  it('applies to fresh compatible tables and repeats without changing inventory', async () => {
    await seed();
    await pool.query(migration);
    expect(await stock()).toBe(3);
    expect((await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.sellable_units'::regclass")).rows[0].relrowsecurity).toBe(true);
  });
  it('permits only active public reads and denies unauthenticated writes and RPC execution', async () => {
    await seed();
    await pool.query("UPDATE public.sellable_units SET status='archived' WHERE id=$1", [unitId]);
    expect((await roleQuery('anon', 'SELECT id FROM public.sellable_units')).rowCount).toBe(0);
    await expect(roleQuery('anon', "INSERT INTO public.sellable_units(product_id,sku,title) VALUES($1,'DENIED','Denied')", [productId])).rejects.toThrow('permission denied');
    await expect(roleQuery('anon', 'UPDATE public.sellable_units SET stock=9')).rejects.toThrow('permission denied');
    await expect(roleQuery('anon', 'DELETE FROM public.sellable_units')).rejects.toThrow('permission denied');
    await expect(roleQuery('anon', 'SELECT * FROM public.decrement_sellable_unit_stock($1,$2)', ['[]', orderId])).rejects.toThrow('permission denied');
  });
  it('allows staff metadata management and denies nonstaff writes and authenticated RPC calls', async () => {
    await seed();
    const admin = randomUUID(), customer = randomUUID();
    await pool.query("INSERT INTO public.users(id,email,role) VALUES($1,'admin@test.local','admin'),($2,'user@test.local','user')", [admin, customer]);
    const allowed = await roleQuery('authenticated', "UPDATE public.sellable_units SET title='Staff title' WHERE id=$1", [unitId], admin);
    expect(allowed.rowCount).toBe(1);
    const denied = await roleQuery('authenticated', "UPDATE public.sellable_units SET title='Customer title' WHERE id=$1", [unitId], customer);
    expect(denied.rowCount).toBe(0);
    expect((await pool.query('SELECT title FROM public.sellable_units WHERE id=$1', [unitId])).rows[0].title).toBe('Staff title');
    await expect(roleQuery('authenticated', 'SELECT * FROM public.decrement_sellable_unit_stock($1,$2)', ['[]', orderId], admin)).rejects.toThrow('permission denied');
  });
  it.each(['authenticated', 'service_role'] as const)('denies unaudited direct inventory writes by %s, including after migration repeat', async (role) => {
    await seed();
    const admin = randomUUID();
    await pool.query("INSERT INTO public.users(id,email,role) VALUES($1,'staff@test.local','admin')", [admin]);
    await pool.query(migration);
    for (const sql of [
      'UPDATE public.sellable_units SET stock=9 WHERE id=$1',
      "UPDATE public.sellable_units SET status='archived' WHERE id=$1",
      'UPDATE public.sellable_units SET product_id=product_id WHERE id=$1',
      'DELETE FROM public.sellable_units WHERE id=$1',
      "INSERT INTO public.sellable_units(product_id,sku,title,stock) VALUES($1,'UNAUDITED','Denied',9)",
    ]) {
      await expect(roleQuery(role, sql, [unitId], admin)).rejects.toThrow('permission denied');
    }
    expect(await stock()).toBe(3); expect(await movements()).toHaveLength(0);
    const metadata = await roleQuery(role, "UPDATE public.sellable_units SET title='Metadata only' WHERE id=$1", [unitId], admin);
    expect(metadata.rowCount).toBe(1);
    expect((await decrement()).success).toBe(true);
    expect(await stock()).toBe(2); expect(await movements()).toHaveLength(1);
  });
  it.each(['authenticated', 'service_role'] as const)('removes the mixed unit-before-parent lock path for %s', async (role) => {
    await seed();
    const admin = randomUUID();
    await pool.query("INSERT INTO public.users(id,email,role) VALUES($1,'mixed@test.local','admin')", [admin]);
    const parentHolder = await pool.connect();
    const directWriter = await pool.connect();
    try {
      await parentHolder.query('BEGIN');
      await parentHolder.query('SELECT id FROM public.products WHERE id=$1 FOR UPDATE', [productId]);
      await directWriter.query('BEGIN');
      await directWriter.query(`SET LOCAL ROLE ${role}`);
      await directWriter.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [admin]);
      await directWriter.query("SET LOCAL lock_timeout='500ms'");
      // The old permission reached the unit lock and then blocked on this
      // held parent. Permission denial must now occur before either row lock.
      await expect(directWriter.query('UPDATE public.sellable_units SET stock=stock-1 WHERE id=$1', [unitId])).rejects.toMatchObject({ code: '42501' });
      await directWriter.query('ROLLBACK');
      // Permitted metadata updates do not request the held parent lock.
      await roleQuery(role, "UPDATE public.sellable_units SET title='Safe metadata' WHERE id=$1", [unitId], admin);
    } finally {
      await directWriter.query('ROLLBACK');
      await parentHolder.query('ROLLBACK');
      directWriter.release(); parentHolder.release();
    }
    expect((await decrement()).success).toBe(true);
    expect(await stock()).toBe(2); expect(await movements()).toHaveLength(1);
  }, 5000);
  it('enforces global normalized SKU uniqueness and nonnegative stock', async () => {
    await seed();
    await expect(pool.query("INSERT INTO public.sellable_units(product_id,sku,title) VALUES($1,'SERUM','Duplicate')", [productId])).rejects.toThrow('uq_sellable_units_sku');
    await expect(pool.query('UPDATE public.sellable_units SET stock=-1 WHERE id=$1', [unitId])).rejects.toThrow('check constraint');
    await expect(pool.query("UPDATE public.sellable_units SET sku='serum' WHERE id=$1", [unitId])).rejects.toThrow('check constraint');
  });
  it.each([0, -1, 1.5, null, '1', 2147483648])('rejects invalid quantity %j without mutation', async (quantity) => {
    await seed();
    const result = await roleQuery('service_role', 'SELECT * FROM public.decrement_sellable_unit_stock($1,$2)', [JSON.stringify([{ sellable_unit_id: unitId, quantity }]), orderId]);
    expect(result.rows[0].error_code).toBe('INVALID_QUANTITY');
    expect(await stock()).toBe(3); expect(await movements()).toHaveLength(0);
  });
  it.each([null, {}, []])('rejects invalid items container %j', async (items) => {
    await seed();
    const result = await roleQuery('service_role', 'SELECT * FROM public.decrement_sellable_unit_stock($1,$2)', [items === null ? null : JSON.stringify(items), orderId]);
    expect(result.rows[0].error_code).toBe('INVALID_QUANTITY');
  });
  it('rejects missing and malformed exact unit identifiers', async () => {
    await seed();
    for (const id of [randomUUID(), 'bad-id']) {
      expect((await decrement([{ sellable_unit_id: id, quantity: 1 }])).error_code).toBe('SELLABLE_UNIT_NOT_FOUND');
    }
    expect(await stock()).toBe(3);
  });
  it('rejects inactive units and insufficient stock without evidence or mutation', async () => {
    await seed();
    expect((await decrement([{ sellable_unit_id: unitId, quantity: 4 }])).error_code).toBe('INSUFFICIENT_STOCK');
    await pool.query("UPDATE public.sellable_units SET status='archived' WHERE id=$1", [unitId]);
    expect((await decrement()).error_code).toBe('SELLABLE_UNIT_INACTIVE');
    expect(await stock()).toBe(3); expect(await movements()).toHaveLength(0);
  });
  it('decrements the exact unit and writes signed causal immutable evidence', async () => {
    await seed();
    expect((await decrement()).success).toBe(true); expect(await stock()).toBe(2);
    expect(await movements()).toEqual([expect.objectContaining({ sellable_unit_id: unitId, product_id: productId, order_id: orderId, quantity_delta: -1, reason: 'sale', created_at: expect.any(Date) })]);
    await expect(pool.query('UPDATE public.inventory_movements SET quantity_delta=-2 WHERE sellable_unit_id=$1', [unitId])).rejects.toThrow('CANONICAL_INVENTORY_MOVEMENT_IMMUTABLE');
    await expect(pool.query('DELETE FROM public.inventory_movements WHERE sellable_unit_id=$1', [unitId])).rejects.toThrow('CANONICAL_INVENTORY_MOVEMENT_IMMUTABLE');
  });
  it('restocks atomically with exact positive causal evidence', async () => {
    await seed();
    const result = await roleQuery('service_role', 'SELECT * FROM public.restock_sellable_unit($1,2,$2)', [unitId, orderId]);
    expect(result.rows[0]).toEqual({ success: true, new_stock: 5 });
    expect(await movements()).toEqual([expect.objectContaining({ sellable_unit_id: unitId, product_id: productId, order_id: orderId, quantity_delta: 2, reason: 'refund' })]);
    for (const quantity of [0, -1]) await expect(roleQuery('service_role', 'SELECT * FROM public.restock_sellable_unit($1,$2,$3)', [unitId, quantity, orderId])).rejects.toThrow('INVALID_QUANTITY');
    await expect(roleQuery('service_role', 'SELECT * FROM public.restock_sellable_unit($1,1,$2)', [randomUUID(), orderId])).rejects.toThrow('SELLABLE_UNIT_NOT_FOUND');
  });
  it('validates all items before mutating and aggregates duplicate unit requests', async () => {
    await seed();
    const result = await decrement([{ sellable_unit_id: unitId, quantity: 1 }, { sellable_unit_id: otherId, quantity: 1 }]);
    expect(result.error_code).toBe('SELLABLE_UNIT_NOT_FOUND');
    expect(await stock()).toBe(3); expect(await movements()).toHaveLength(0);
    expect((await decrement([{ sellable_unit_id: unitId, quantity: 2 }, { sellable_unit_id: unitId, quantity: 2 }])).error_code).toBe('INSUFFICIENT_STOCK');
    expect(await stock()).toBe(3);
  });
  it('rolls back stock when movement insertion fails', async () => {
    await seed();
    await pool.query("ALTER TABLE public.inventory_movements ADD CONSTRAINT ccp12_test_reject CHECK(reason <> 'sale')");
    try {
      await expect(decrement()).rejects.toThrow('ccp12_test_reject');
      expect(await stock()).toBe(3); expect(await movements()).toHaveLength(0);
    } finally { await pool.query('ALTER TABLE public.inventory_movements DROP CONSTRAINT ccp12_test_reject'); }
  });
  it('recognizes concurrent identical sale retries and rejects changed payloads', async () => {
    await seed();
    const results = await Promise.all([decrement(), decrement()]);
    expect(results.every(r => r.success)).toBe(true);
    expect(await stock()).toBe(2); expect(await movements()).toHaveLength(1);
    await expect(decrement([{ sellable_unit_id: unitId, quantity: 2 }])).rejects.toThrow('ORDER_INVENTORY_PAYLOAD_MISMATCH');
    expect(await stock()).toBe(2);
  });
  it('rejects legacy sale receipts rather than double-decrementing a finalized order', async () => {
    await seed();
    await pool.query("INSERT INTO public.inventory_movements(product_id,order_id,quantity_delta,reason) VALUES($1,$2,-1,'sale')", [productId, orderId]);
    await expect(decrement()).rejects.toThrow('ORDER_HAS_LEGACY_INVENTORY_MOVEMENTS');
    expect(await stock()).toBe(3);
  });

  it.each([[1, 2], [10, 50]])('proves real contention: stock=%i, callers=%i', async (initial, callers) => {
    await seed(initial);
    const orders = Array.from({ length: callers }, () => randomUUID());
    await pool.query('INSERT INTO public.orders(id) SELECT unnest($1::uuid[])', [orders]);
    const results = await Promise.all(orders.map(order => decrement(undefined, order)));
    expect(results.filter(r => r.success)).toHaveLength(initial);
    expect(results.filter(r => !r.success && r.error_code === 'INSUFFICIENT_STOCK')).toHaveLength(callers - initial);
    expect(await stock()).toBe(0); expect(await movements()).toHaveLength(initial);
    console.info(`CCP-12 real DB: stock=${initial}, callers=${callers}, winners=${initial}, insufficient=${callers - initial}, final=0, movements=${initial}`);
  }, 30000);

  it('locks reversed multi-item requests deterministically and preserves the parent sum', async () => {
    await seed(2);
    await pool.query("INSERT INTO public.sellable_units(id,product_id,sku,title,stock) VALUES($1,$2,'OTHER','Other',2)", [otherId, productId]);
    const secondOrder = randomUUID();
    await pool.query('INSERT INTO public.orders(id) VALUES($1)', [secondOrder]);
    const first = [{ sellable_unit_id: unitId, quantity: 1 }, { sellable_unit_id: otherId, quantity: 1 }];
    const results = await Promise.all([decrement(first), decrement([...first].reverse(), secondOrder)]);
    expect(results.every(r => r.success)).toBe(true);
    expect(await stock()).toBe(0); expect(await stock(otherId)).toBe(0);
    expect((await pool.query('SELECT stock FROM public.products WHERE id=$1', [productId])).rows[0].stock).toBe(0);
  }, 30000);

  it('backfills standalone and variant sources repeatably with zero mapping or stock gaps', async () => {
    const variantProduct = randomUUID(), archived = randomUUID();
    await pool.query("INSERT INTO public.products(id,name,slug,stock,status,cost) VALUES($1,'Serum','sérum-glow',7,'active',10),($2,'Archived','archived',5,'archived',NULL)", [productId, archived]);
    await pool.query("INSERT INTO public.products(id,name,sku,stock,status,variants) VALUES($1,'Colors','COLORS',5,'active',$2)", [variantProduct, JSON.stringify([{ name: 'Red', sku: 'red-01', stock: 2, price: 20, attributes: { color: 'Red' } }, { name: 'Blue', stock: 3 }])]);
    await pool.query(backfill);
    const units = (await pool.query('SELECT * FROM public.sellable_units ORDER BY sku')).rows;
    expect(units).toHaveLength(4);
    expect(units).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: 'SKU-SERUMGLOW', product_id: productId, stock: 7 }),
      expect.objectContaining({ sku: 'RED-01', product_id: variantProduct, stock: 2, attributes: { color: 'Red' } }),
      expect.objectContaining({ sku: 'COLORS-BLUE', product_id: variantProduct, stock: 3 }),
      expect.objectContaining({ sku: 'SKU-ARCHIVED', product_id: archived, stock: 5, status: 'archived' }),
    ]));
    await pool.query(backfill);
    expect((await pool.query('SELECT * FROM public.sellable_units ORDER BY sku')).rows).toEqual(units);
    expect((await pool.query(`SELECT p.id FROM public.products p WHERE p.stock <> (
      SELECT COALESCE(sum(s.stock),0) FROM public.sellable_units s WHERE s.product_id=p.id AND s.status='active')`)).rowCount).toBe(0);
  });
  it('reports original parent-versus-variant stock discrepancy before compatibility synchronization', async () => {
    await pool.query("INSERT INTO public.products(id,name,sku,stock,status,variants) VALUES($1,'Mismatch','MISMATCH',100,'active',$2)", [productId, JSON.stringify([{ name: 'Red', stock: 2 }, { name: 'Blue', stock: 3 }])]);
    const client = await pool.connect();
    try {
      await expect(client.query(backfill)).rejects.toMatchObject({
        message: 'BACKFILL_LEGACY_PARENT_STOCK_MISMATCH',
        detail: `product_id=${productId}, legacy_parent_stock=100, variant_stock_total=5, discrepancy=95`,
      });
    } finally {
      await client.query('ROLLBACK'); client.release();
    }
    expect((await pool.query('SELECT stock FROM public.products WHERE id=$1', [productId])).rows[0].stock).toBe(100);
    expect((await pool.query('SELECT * FROM public.sellable_units')).rowCount).toBe(0);
  });
  it.each(['archived', null])('keeps archived variant backfill repeatable with parent status %s while explaining compatibility zero', async (status) => {
    await pool.query("INSERT INTO public.products(id,name,sku,stock,status,variants) VALUES($1,'Archived colors','ARCHIVED-COLORS',5,$3,$2)", [productId, JSON.stringify([{ name: 'Red', stock: 2 }, { name: 'Blue', stock: 3 }]), status]);
    await pool.query(backfill);
    const before = (await pool.query('SELECT * FROM public.sellable_units ORDER BY sku')).rows;
    expect(before.map(unit => unit.stock)).toEqual([3, 2]);
    expect((await pool.query('SELECT stock FROM public.products WHERE id=$1', [productId])).rows[0].stock).toBe(0);
    await pool.query(backfill);
    expect((await pool.query('SELECT * FROM public.sellable_units ORDER BY sku')).rows).toEqual(before);
  });
  it('fails the whole backfill on global SKU collisions rather than losing mappings', async () => {
    await pool.query("INSERT INTO public.products(name,sku,stock,status) VALUES('A','same',1,'active'),('B','SAME',2,'active')");
    const client = await pool.connect();
    try {
      await expect(client.query(backfill)).rejects.toThrow('BACKFILL_DUPLICATE_CANONICAL_SKU');
      await client.query('ROLLBACK');
    } finally { client.release(); }
    expect((await pool.query('SELECT * FROM public.sellable_units')).rowCount).toBe(0);
  });
});
