import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function run() {
  await client.connect();
  await client.query("NOTIFY pgrst, 'reload schema'");
  console.log('Schema cache reloaded');
  await client.end();
}
run().catch(console.error);
