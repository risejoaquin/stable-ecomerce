import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_schema, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'stores';
  `);
  console.table(res.rows);
  await client.end();
}
run().catch(console.error);
