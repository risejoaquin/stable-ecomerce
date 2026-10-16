// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('A-01 coupon discount enum contract', () => {
  it('keeps the fixed-discount form value aligned with the production SQL constraint', () => {
    const sql = readFileSync(new URL('../../scripts/db/001_selfcare_sinners_production_schema.sql', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../../src/pages/admin/CouponsPage.tsx', import.meta.url), 'utf8');
    expect(sql).toMatch(/discount_type\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(discount_type\s+IN\s*\('percentage',\s*'fixed'\)\)/i);
    expect(page).toContain('<option value="percentage">Porcentaje (%)</option>');
    expect(page).toContain('<option value="fixed">Monto fijo ($)</option>');
    expect(page).not.toContain('fixed_amount');
  });
});
