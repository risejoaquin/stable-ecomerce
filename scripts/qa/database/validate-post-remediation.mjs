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
  const funcQuery = `
    SELECT
      p.proname AS name,
      p.prosecdef AS is_security_definer,
      coalesce(array_to_string(p.proconfig, ','), '') AS config,
      p.proacl::text AS acl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY($1::text[])
    ORDER BY p.proname;
  `;

  const funcs = await client.query(funcQuery, [[
    'finalize_paid_order',
    'restock_refunded_order',
    'decrement_stock',
    'consume_coupon_after_payment'
  ]]);

  const colQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'inventory_restocked_at';
  `;

  const cols = await client.query(colQuery);

  const report = {
    functions: funcs.rows.map(f => {
      const acl = f.acl || '';
      return {
        name: f.name,
        is_security_definer: f.is_security_definer,
        search_path_config: f.config,
        raw_acl: acl,
        has_public_execute: acl.includes('=X/'),
        has_anon_execute: acl.includes('anon=X/'),
        has_authenticated_execute: acl.includes('authenticated=X/'),
        has_service_role_execute: acl.includes('service_role=X/')
      };
    }),
    schema: cols.rows[0] || null
  };

  console.log(JSON.stringify(report, null, 2));
} catch (err) {
  console.error('Validation error:', err);
  process.exit(1);
} finally {
  await client.end();
}
