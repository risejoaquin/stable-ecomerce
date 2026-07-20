import pg from 'pg';
import fs from 'fs';
const { Client } = pg;
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});
async function run() {
  await client.connect();
  const sql = fs.readFileSync('add_subcategory.sql', 'utf-8');
  await client.query(sql);
  console.log('Success');
  await client.end();
}
run().catch(console.error);
