import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT id, name, owner_user_id FROM stores;");
  console.table(res.rows);
  await client.end();
}
run();
