import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required. The value is never printed.');
  process.exit(2);
}

const client = new Client({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  const criticalNames = ['finalize_paid_order','decrement_stock','consume_coupon_after_payment','restock_refunded_item'];
  const functions = await client.query(`
    select n.nspname as schema_name,
           p.proname,
           p.prosecdef,
           p.proacl,
           pg_get_function_identity_arguments(p.oid) as args,
           pg_get_userbyid(p.proowner) as owner,
           coalesce(array_to_string(p.proconfig, ','), '') as config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where p.proname = any($1::text[])
     order by p.proname;
  `, [criticalNames]);

  const rls = await client.query(`
    select schemaname, tablename, rowsecurity
      from pg_tables
     where schemaname = 'public'
     order by tablename;
  `);

  const policies = await client.query(`
    select schemaname, tablename, policyname, roles, cmd
      from pg_policies
     where schemaname = 'public'
     order by tablename, policyname;
  `);

  const result = {
    generatedAt: new Date().toISOString(),
    criticalFunctions: functions.rows,
    publicTables: rls.rows,
    policies: policies.rows,
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.end();
}
