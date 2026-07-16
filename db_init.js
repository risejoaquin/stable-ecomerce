import pg from 'pg';
import dotenv from 'dotenv';
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      product_id uuid REFERENCES products(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text,
      email text,
      items jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      reminder_sent boolean DEFAULT false
    );
  `);
  console.log('Tables created');
  await client.end();
}
run();
