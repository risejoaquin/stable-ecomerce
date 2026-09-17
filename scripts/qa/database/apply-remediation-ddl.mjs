import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('DATABASE_URL or SUPABASE_DB_URL is required.');
  process.exit(2);
}

const sqlPath = path.resolve('AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql');
const candidateSql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

await client.connect();

try {
  console.log('Beginning atomic DDL transaction...');
  await client.query('BEGIN;');

  console.log('Executing candidate SQL statements...');
  await client.query(candidateSql);

  console.log('Committing transaction...');
  await client.query('COMMIT;');
  console.log('SUCCESS: Remediation DDL applied atomically.');
} catch (err) {
  console.error('ERROR during DDL execution, rolling back:', err);
  try {
    await client.query('ROLLBACK;');
    console.log('ROLLBACK executed successfully.');
  } catch (rbErr) {
    console.error('ROLLBACK failed:', rbErr);
  }
  process.exit(1);
} finally {
  await client.end();
}
