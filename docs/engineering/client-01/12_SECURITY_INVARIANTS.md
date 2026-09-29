# Client 01 Security Invariants & Defensive Architecture

## 1. Executive Summary

This document specifies the mandatory security invariants and defensive programming rules governing the Client 01 implementation.

All engineers must adhere strictly to these principles. No pull request violating these invariants may be approved or merged.

---

## 2. Core Security Invariants

### 2.1 Invariant SEC-INV-1: Zero-Trust Frontend Pricing
- **Threat Model**: Malicious actors or compromised POS terminals modifying client-side JavaScript memory to submit discounted or zero-dollar prices for goods.
- **Enforcement Rule**: The backend server **NEVER** trusts client-submitted prices, subtotals, or order totals.
- **Implementation Guarantee**:
  - The sales payload validator strips or rejects any submitted price fields.
  - The backend resolves the unit price directly from `sellable_units.price_override`, falling back to `products.price`.
  - All arithmetic (line totals, order discounts, taxes, and final order total) is executed exclusively inside the backend Node.js runtime and verified in database transactions.

### 2.2 Invariant SEC-INV-2: Immutable Audit Trails
- **Threat Model**: Fraudulent order cancellations, phantom refunds, or unauthorized inventory write-offs by rogue staff members.
- **Enforcement Rule**: Every financial mutation (sale, refund, payment capture) and stock mutation (decrement, restock, manual adjustment) must record an immutable entry into `audit_logs` or `inventory_movements`.
- **Implementation Guarantee**:
  - Audit records are written within the same database transaction.
  - `audit_logs` and `inventory_movements` have append-only privileges. `UPDATE` and `DELETE` permissions are revoked across all application roles.

### 2.3 Invariant SEC-INV-3: SQL Injection Immunity & RPC Encapsulation
- **Threat Model**: SQL injection via crafted SKU strings, search queries, or JSON payloads.
- **Enforcement Rule**: Raw string concatenation of SQL statements (`query = 'SELECT * FROM ... ' + input`) is strictly prohibited.
- **Implementation Guarantee**:
  - All database interactions must use parameterized queries through Supabase JS SDK or prepared statements.
  - Multi-table transactional mutations (such as stock locking and order finalization) must be encapsulated in PostgreSQL stored procedures (`SECURITY DEFINER`) with explicitly pinned search paths:
    ```sql
    SET search_path = public, pg_temp;
    ```

### 2.4 Invariant SEC-INV-4: Data Minimization & Projection Whitelisting
- **Threat Model**: Exposure of wholesale supplier margins, wholesale cost prices, or internal warehouse notes to storefront shoppers or unprivileged callers.
- **Enforcement Rule**: Catalog and product endpoints must use explicit projection whitelisting (AUDIT-01A standard).
- **Implementation Guarantee**:
  - `SELECT *` queries on public routes are prohibited.
  - Sensitive columns (`sellable_units.cost_price`, `orders.notes`, `users.password_hash`, `stripe_events.payload`) must never appear in public API responses.

---

## 3. Row-Level Security (RLS) Policy Specifications

Every database table deployed in Client 01 must have RLS enabled and explicit policies defined:

```sql
-- 1. sellable_units RLS
ALTER TABLE sellable_units ENABLE ROW LEVEL SECURITY;

-- Public can view active SKUs for browsing/stock status
CREATE POLICY "Public read active sellable units" ON sellable_units
  FOR SELECT
  USING (status = 'active');

-- Staff can view and modify all units
CREATE POLICY "Staff manage sellable units" ON sellable_units
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin')
    )
  );

-- 2. order_payments RLS
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Customers can view payments for their own orders
CREATE POLICY "Customers view own payments" ON order_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_payments.order_id AND orders.customer_user_id = auth.uid()
    )
  );

-- Staff can view and manage all payments
CREATE POLICY "Staff manage order payments" ON order_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin')
    )
  );

-- 3. audit_logs Append-Only RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view audit logs
CREATE POLICY "Staff view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin')
    )
  );

-- Backend service role can insert audit logs
CREATE POLICY "Service insert audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Explicitly disallow UPDATE and DELETE on audit logs
REVOKE UPDATE, DELETE ON audit_logs FROM public, authenticated, anon;
```

---

## 4. Backend Secret Management & Hygiene

1. **Zero Secrets in Repository**: No `.env`, secret keys, or live API credentials may be committed.
2. **Environment Variable Segregation**:
   - `STRIPE_SECRET_KEY`: Backend runtime only (Railway).
   - `STRIPE_WEBHOOK_SECRET`: Backend runtime only (Railway).
   - `RESEND_API_KEY`: Backend runtime only (Railway).
   - `SUPABASE_SERVICE_ROLE_KEY`: Backend runtime only (Railway).
   - `VITE_SUPABASE_ANON_KEY`: Public client-safe key only.
3. **No Key Echoing in Logs**: Structured loggers (`pino`) must configure redaction for sensitive fields:
   - `req.headers.authorization`
   - `req.body.payment.tenderDetails.cardNumber`
   - `req.body.payment.referenceCode`
   - `password`, `token`, `secret`
