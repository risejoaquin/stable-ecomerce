import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
async function run() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL
  });
  try {
    await client.connect();
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';`);
    console.log('Status column added');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
