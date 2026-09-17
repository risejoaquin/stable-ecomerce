import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL is required.');
  process.exit(2);
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

await client.connect();

try {
  // 1-6 Functions check
  const funcQuery = `
    SELECT 
      p.proname AS name,
      p.prosecdef AS is_security_definer,
      p.proacl::text AS acl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY($1::text[])
    ORDER BY p.proname;
  `;
  const funcs = await client.query(funcQuery, [[
    'finalize_paid_order',
    'decrement_stock',
    'consume_coupon_after_payment',
    'restock_refunded_order'
  ]]);

  // 7 Column check
  const colQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'inventory_restocked_at';
  `;
  const cols = await client.query(colQuery);

  const preflight = {
    functions: funcs.rows,
    columnExists: cols.rows.length > 0,
    columnDetails: cols.rows[0] || null
  };

  console.log(JSON.stringify(preflight, null, 2));
} catch (err) {
  console.error('Preflight error:', err);
  process.exit(1);
} finally {
  await client.end();
}
