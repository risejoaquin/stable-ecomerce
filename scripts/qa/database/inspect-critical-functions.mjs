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
  const criticalNames = [
    'consume_coupon_after_payment',
    'decrement_stock',
    'finalize_paid_order',
    'restock_refunded_item'
  ];

  const query = `
    SELECT 
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_userbyid(p.proowner) AS owner,
      p.prosecdef AS is_security_definer,
      coalesce(array_to_string(p.proconfig, ','), '') AS config,
      pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_function_result(p.oid) AS return_type,
      p.proacl::text AS acl,
      pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY($1::text[])
    ORDER BY p.proname;
  `;

  const { rows } = await client.query(query, [criticalNames]);

  console.log(JSON.stringify(rows, null, 2));
} catch (err) {
  console.error('Error inspecting functions:', err);
  process.exit(1);
} finally {
  await client.end();
}
