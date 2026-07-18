import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync('extra_features.sql', 'utf-8');
  await client.query(sql);
  
  // also run the verification update just in case
  const verifySql = fs.readFileSync('add_verification_to_users.sql', 'utf-8');
  await client.query(verifySql);
  
  console.log('Success');
  await client.end();
}
run().catch(console.error);
