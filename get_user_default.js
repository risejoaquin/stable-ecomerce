import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public'");
  console.log(res.rows);
  await client.end();
}
run();
