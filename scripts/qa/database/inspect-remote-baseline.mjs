import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL is not defined in environment');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

try {
  // 1. Check schema_migrations table
  const migTable = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name = 'schema_migrations';
  `);
  console.log('Migration tables found:', JSON.stringify(migTable.rows));

  if (migTable.rows.length > 0) {
    const schemaName = migTable.rows[0].table_schema;
    const migs = await client.query(`SELECT * FROM ${schemaName}.schema_migrations ORDER BY version;`);
    console.log('Remote migrations count:', migs.rows.length);
    console.log('Remote migrations:', JSON.stringify(migs.rows));
  } else {
    console.log('No schema_migrations table exists on remote database.');
  }

  // 2. Extensions
  const exts = await client.query(`SELECT extname, extversion FROM pg_extension ORDER BY extname;`);
  console.log('Extensions:', exts.rows.map(r => `${r.extname} (${r.extversion})`).join(', '));

  // 3. Tables in public
  const tbls = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('Public tables count:', tbls.rows.length);
  console.log('Public tables:', tbls.rows.map(r => r.table_name).join(', '));

  // 4. Critical functions
  const funcs = await client.query(`
    SELECT p.proname, p.prosecdef, pg_get_userbyid(p.proowner) as owner, p.proacl::text as acl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY($1::text[])
    ORDER BY p.proname;
  `, [['finalize_paid_order', 'restock_refunded_order', 'decrement_stock', 'consume_coupon_after_payment']]);
  console.log('Critical functions:', JSON.stringify(funcs.rows, null, 2));

  // 5. RLS status on public tables
  const rls = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.log('RLS summary: total tables =', rls.rows.length, ', RLS enabled =', rls.rows.filter(r => r.rowsecurity).length);

} catch (err) {
  console.error('Error during inspection:', err);
  process.exit(1);
} finally {
  await client.end();
}
