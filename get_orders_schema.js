import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('orders', 'order_items');");
  console.log(res.rows);
  await client.end();
}
run();
