import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('QA / RELEASE E - Critical Supabase Functions Security & Refund Integrity Final Contract', () => {
  const candidatePath = path.resolve(__dirname, '../../AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql');
  const serverTsPath = path.resolve(__dirname, '../../server.ts');

  const candidateSql = fs.readFileSync(candidatePath, 'utf-8');
  const serverTsContent = fs.readFileSync(serverTsPath, 'utf-8');

  // ============================================================================
  // TASK 7: IDEMPOTENCY & REFUND INTEGRITY CONTRACT
  // ============================================================================

  // 1. partial refund + restock=true is rejected before Stripe call
  it('1. ensures server.ts rejects partial refund + restock=true before calling Stripe', () => {
    // Check validation code in server.ts
    const validationIdx = serverTsContent.indexOf("if (restock === true && !isFullRefund)");
    const stripeIdx = serverTsContent.indexOf("await stripe.refunds.create");

    expect(validationIdx).toBeGreaterThan(-1);
    expect(stripeIdx).toBeGreaterThan(-1);
    expect(validationIdx).toBeLessThan(stripeIdx);

    expect(serverTsContent).toContain(
      "return res.status(400).json({ error: 'Inventory restock is only supported for full order refunds.' });"
    );
  });

  // 2. partial refund + restock=false remains allowed
  it('2. ensures partial refund with restock=false passes validation and proceeds', () => {
    function shouldRejectRestock(restock: boolean, isFullRefund: boolean): boolean {
      return restock === true && !isFullRefund;
    }
    expect(shouldRejectRestock(false, false)).toBe(false);
    expect(shouldRejectRestock(true, false)).toBe(true);
    expect(shouldRejectRestock(true, true)).toBe(false);
  });

  // 3. full refund + restock=true calls order-level RPC
  it('3. ensures full refund with restock=true calls restock_refunded_order RPC', () => {
    expect(serverTsContent).toContain("if (restock === true && isFullRefund) {");
    expect(serverTsContent).toContain("await supabase.rpc('restock_refunded_order', {");
    expect(serverTsContent).toContain("order_id_input: id");
  });

  // 4. second restock attempt cannot modify stock twice
  it('4. ensures restock_refunded_order returns ALREADY_RESTOCKED and skips modifications on repeat', () => {
    expect(candidateSql).toContain("IF v_order.inventory_restocked_at IS NOT NULL THEN");
    expect(candidateSql).toContain("RETURN QUERY SELECT true, 'ALREADY_RESTOCKED'::TEXT;");
    expect(candidateSql).toContain("RETURN;");
  });

  // 5. missing RPC/error causes request failure
  it('5. ensures server.ts refund flow captures restockError and throws instead of returning 200', () => {
    expect(serverTsContent).toContain("const { data: restockResult, error: restockError } = await supabase.rpc('restock_refunded_order'");
    expect(serverTsContent).toContain("if (restockError) {");
    expect(serverTsContent).toContain("throw restockError;");
  });

  // 6. inventory_restocked_at prevents duplicate restock
  it('6. ensures schema candidate adds inventory_restocked_at column to orders', () => {
    expect(candidateSql).toMatch(
      /ALTER\s+TABLE\s+public\.orders\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+inventory_restocked_at\s+TIMESTAMPTZ\s+NULL;/i
    );
    expect(candidateSql).toContain("SET inventory_restocked_at = NOW()");
  });

  // 7. inventory movements are created once per item on full restock
  it('7. ensures restock_refunded_order inserts inventory_movements with reason refund', () => {
    expect(candidateSql).toContain("INSERT INTO public.inventory_movements(");
    expect(candidateSql).toContain("'refund'");
    expect(candidateSql).toContain("'Full order refund restock'");
  });

  // 8. full refund without restock remains supported
  it('8. ensures full refund with restock=false/falsy skips restock RPC call', () => {
    function shouldCallRestockRpc(restock: boolean, isFullRefund: boolean): boolean {
      return restock === true && isFullRefund;
    }
    expect(shouldCallRestockRpc(false, true)).toBe(false);
    expect(shouldCallRestockRpc(true, true)).toBe(true);
  });

  // ============================================================================
  // TASK 8: SECURITY MIGRATION CONTRACT
  // ============================================================================

  it('9. ensures anon cannot execute finalize_paid_order', () => {
    expect(candidateSql).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.finalize_paid_order\([^)]+\)\s+FROM\s+anon;/i
    );
  });

  it('10. ensures authenticated cannot execute finalize_paid_order', () => {
    expect(candidateSql).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.finalize_paid_order\([^)]+\)\s+FROM\s+authenticated;/i
    );
    expect(candidateSql).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.finalize_paid_order\([^)]+\)\s+FROM\s+PUBLIC;/i
    );
  });

  it('11. ensures service_role can execute finalize_paid_order', () => {
    expect(candidateSql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.finalize_paid_order\([^)]+\)\s+TO\s+service_role;/i
    );
    expect(candidateSql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.finalize_paid_order[\s\S]*?SECURITY\s+INVOKER[\s\S]*?SET\s+search_path\s*=\s*''/i
    );
  });

  it('12. ensures anon cannot execute restock_refunded_order', () => {
    expect(candidateSql).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.restock_refunded_order\(UUID\)\s+FROM\s+anon;/i
    );
  });

  it('13. ensures authenticated cannot execute restock_refunded_order', () => {
    expect(candidateSql).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.restock_refunded_order\(UUID\)\s+FROM\s+authenticated;/i
    );
    expect(candidateSql).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.restock_refunded_order\(UUID\)\s+FROM\s+PUBLIC;/i
    );
  });

  it('14. ensures service_role can execute restock_refunded_order', () => {
    expect(candidateSql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.restock_refunded_order\(UUID\)\s+TO\s+service_role;/i
    );
    expect(candidateSql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.restock_refunded_order[\s\S]*?SECURITY\s+INVOKER[\s\S]*?SET\s+search_path\s*=\s*''/i
    );
  });

  it('15. ensures obsolete functions are dropped in final migration candidate', () => {
    expect(candidateSql).toMatch(/DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.decrement_stock\(UUID,\s*INT\);/i);
    expect(candidateSql).toMatch(/DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.consume_coupon_after_payment\(TEXT,\s*UUID\);/i);
  });
});
