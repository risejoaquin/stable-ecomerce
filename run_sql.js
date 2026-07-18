import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function run() {
  if (!connectionString) {
    console.error('No DB URL');
    return;
  }
  const client = new Client({ connectionString });
  await client.connect();
  const sql = fs.readFileSync('add_users.sql', 'utf-8');
  await client.query(sql);
  console.log('SQL executed');
  await client.end();
}
run();
