import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pg;
async function run() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS addresses jsonb DEFAULT '[]'::jsonb;`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;`);
  console.log('Columns added');
  await client.end();
}
run();
