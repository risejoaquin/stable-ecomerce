import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const client = new pg.Client(process.env.SUPABASE_DB_URL);
async function run() {
  await client.connect();
  const res = await client.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('orders', 'stores', 'reviews', 'wishlist_items')");
  console.table(res.rows);
  await client.end();
}
run();
