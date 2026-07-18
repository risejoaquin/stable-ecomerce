import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'");
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}
run();
