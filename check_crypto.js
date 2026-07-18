import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT crypt('test', gen_salt('bf'));");
    console.log(res.rows);
  } catch (e) {
    console.log("Error:", e.message);
  }
  await client.end();
}
run();
