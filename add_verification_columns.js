import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const client = new pg.Client(process.env.SUPABASE_DB_URL);
async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_token TEXT UNIQUE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NULL;
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON public.users(verification_token);
    `);
    console.log("Database updated successfully.");
  } catch (e) {
    console.error(e);
  }
  await client.end();
}
run();
