import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT customer_email FROM orders LIMIT 1;");
  console.log('Query successful');
  await client.end();
}
run();
