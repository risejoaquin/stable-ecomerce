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
    const res = await client.query('SELECT current_user');
    console.log('Connected!', res.rows);
    
    // Add columns
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;`);
    console.log('Columns added');
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
