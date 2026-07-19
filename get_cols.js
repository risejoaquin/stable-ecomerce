import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pg;
async function run() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log(res.rows.filter(r => !r.table_name.startsWith('pg_') && !r.table_name.startsWith('sql_')));
  await client.end();
}
run();
