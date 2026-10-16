// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const url = new URL('../../scripts/qa/database/audit-readonly-schema.mjs', import.meta.url);
const source = readFileSync(url, 'utf8');

describe('C-01/C-04 preflight safety contract', () => {
  it('rejects execution without explicit read-only target variable, without connecting', () => {
    const env = { ...process.env };
    delete env.CCP_AUDIT_READONLY_DATABASE_URL;
    const result = spawnSync(process.execPath, [url.pathname], { env, encoding: 'utf8', timeout: 5000 });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('CCP_AUDIT_READONLY_DATABASE_URL');
    expect(result.stdout).not.toContain('postgres://');
  });

  it('begins in read-only mode and does not execute mutating SQL statements', () => {
    expect(source).toContain("await client.query('BEGIN READ ONLY')");
    expect(source).toContain("await client.query('ROLLBACK')");
    expect(source).not.toMatch(/client\.query\(\s*['"`]\s*(?:INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|GRANT|REVOKE|TRUNCATE)\b/i);
    expect(source).not.toMatch(/process\.env\.(?:DATABASE_URL|SUPABASE_DB_URL)/);
  });

  it('checks effective role privileges, function security and inventory mapping', () => {
    expect(source).toContain("has_function_privilege('anon', p.oid, 'EXECUTE')");
    expect(source).toContain("has_table_privilege('authenticated', c.oid, 'SELECT')");
    expect(source).toContain('c.relrowsecurity AS rls_enabled');
    expect(source).toContain('p.prosecdef AS security_definer');
    expect(source).toContain('FROM public.sellable_units');
    expect(source).toContain('unmapped_products');
    expect(source).toContain('stock_discrepancies');
  });
});
