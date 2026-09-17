# Supabase Critical Functions Security Audit (SEC-018 / SEC-019)

DATE: 2026-09-17T15:58:00-07:00
AGENT: Codex / Antigravity
ENVIRONMENT: Supabase Postgres (`dporfgsbwsyqzmlnqrug`), Railway Production (`heroic-solace`), Local Windows PowerShell
MODE: READ-ONLY / NO PRODUCTION CHANGES
COMMIT: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640

---

## 1. Summary Matrix

| FUNCTION | EXISTS | SECURITY DEFINER | CURRENT EXECUTE | CALLERS | CLASSIFICATION | RISK | RECOMMENDED PERMISSION MODEL |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| `consume_coupon_after_payment` | YES | YES | `PUBLIC`, `anon`, `authenticated`, `service_role` | None in active codebase (legacy Phase A / `database_schema.sql`) | UNUSED | HIGH | Deprecate / DROP or REVOKE ALL, GRANT only to `service_role` with `SET search_path = public` |
| `decrement_stock` | YES | YES | `PUBLIC`, `anon`, `authenticated`, `service_role` | None in runtime (`update-stock.cjs` script only; absorbed by `finalize_paid_order`) | UNUSED | CRITICAL | Deprecate / DROP or REVOKE ALL, GRANT only to `service_role` with `SET search_path = public` |
| `finalize_paid_order` | YES | YES | `PUBLIC`, `anon`, `authenticated`, `service_role` | `server.ts:324` (Stripe `checkout.session.completed` webhook) | SERVER_ONLY | CRITICAL | `REVOKE EXECUTE ON FUNCTION finalize_paid_order FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;` add `SET search_path = public` and schema-qualify tables |
| `restock_refunded_item` | NO | N/A (Missing) | N/A (Function absent in `pg_proc`) | `server.ts:2319` (`/api/admin/orders/:id/refund` when `restock === true`) | USED_BUT_MISSING | HIGH | CREATE with `SECURITY DEFINER`, `SET search_path = public`, schema-qualified tables; `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;` |

---

## 2. Detailed Caller Inventory (Task 1)

### Caller 1: `finalize_paid_order`
- **FUNCTION:** `finalize_paid_order`
- **CALLER FILE:** `server.ts`
- **LINE:** 324 (invoked inside `finalizeCheckoutSession(event, session)`)
- **PARENT CALLER:** `server.ts:652` in Stripe webhook handler for `event.type === 'checkout.session.completed'`
- **CALL TYPE:** SERVER
- **AUTH CONTEXT:** Backend service role client (`SUPABASE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`). Never called by browser client.
- **NOTES:** Function takes `order_id_input`, `stripe_session_id_input`, `stripe_payment_intent_id_input`, and `customer_email_input`. Atomically acquires `FOR UPDATE` lock on `orders`, verifies stock, decrements `products.stock`, logs to `inventory_movements`, increments `coupons.current_uses`, and transitions order to `'pagado'` or `'inventory_exception'`.

### Caller 2: `restock_refunded_item`
- **FUNCTION:** `restock_refunded_item`
- **CALLER FILE:** `server.ts`
- **LINE:** 2319 (invoked inside route `app.post('/api/admin/orders/:id/refund', requireAuth(), ...)`)
- **CALL TYPE:** SERVER
- **AUTH CONTEXT:** Authenticated admin endpoint executing through server-side Supabase client.
- **NOTES:** Called in a loop over `order.order_items` when admin passes `{ restock: true }`. Because the function does NOT exist in the live database, this admin action currently throws a runtime error (`PGRST202`).

### Caller 3: `decrement_stock`
- **FUNCTION:** `decrement_stock`
- **CALLER FILE:** `update-stock.cjs`
- **LINE:** 30
- **CALL TYPE:** SCRIPT (ad-hoc developer patch script from Phase A)
- **AUTH CONTEXT:** Development script only. Not referenced in `server.ts`, frontend, or API routes.
- **NOTES:** Superceded by `finalize_paid_order` which performs atomic stock decrement directly inside PostgreSQL.

### Caller 4: `consume_coupon_after_payment`
- **FUNCTION:** `consume_coupon_after_payment`
- **CALLER FILE:** None in runtime code. Only present in `database_schema.sql` (line 225) and `scripts/db/001_selfcare_sinners_production_schema.sql` (line 225).
- **CALL TYPE:** UNUSED / HISTORICAL
- **AUTH CONTEXT:** None.
- **NOTES:** Superceded by `finalize_paid_order` lines 138-146 which performs coupon usage increment directly.

---

## 3. Database Metadata & Schema Qualification (Task 2)

Live metadata retrieved from `pg_proc` on project `dporfgsbwsyqzmlnqrug`:

### `consume_coupon_after_payment`
- **Schema:** `public`
- **Owner:** `postgres`
- **Security Definer:** `true`
- **search_path (`config`):** `""` (Empty / Unset)
- **Arguments:** `coupon_code_input text, store_id_input uuid`
- **Return type:** `void`
- **ACL:** `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`
  - `=` represents `PUBLIC`
  - `X` represents `EXECUTE`
  - All roles have execute privileges.
- **Tables modified:** `coupons`
- **Functions called:** `NOW()`
- **Schema Qualification Analysis:** **UNQUALIFIED**. The SQL statement is `UPDATE coupons ...` without `public.` prefix. Combined with `SECURITY DEFINER` and unset `search_path`, this is susceptible to search_path hijacking.

### `decrement_stock`
- **Schema:** `public`
- **Owner:** `postgres`
- **Security Definer:** `true`
- **search_path (`config`):** `""` (Empty / Unset)
- **Arguments:** `product_id uuid, quantity integer`
- **Return type:** `void`
- **ACL:** `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`
- **Tables modified:** `products`, `inventory_movements`
- **Functions called:** `NOW()`, `RAISE EXCEPTION`
- **Schema Qualification Analysis:** **UNQUALIFIED**. Uses `UPDATE products ...` and `INSERT INTO inventory_movements ...` without `public.` prefix.

### `finalize_paid_order`
- **Schema:** `public`
- **Owner:** `postgres`
- **Security Definer:** `true`
- **search_path (`config`):** `""` (Empty / Unset)
- **Arguments:** `order_id_input uuid, stripe_session_id_input text, stripe_payment_intent_id_input text, customer_email_input text`
- **Return type:** `TABLE(success boolean, final_status text, message text)`
- **ACL:** `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`
- **Tables read/locked/modified:** `orders`, `order_items`, `products`, `inventory_movements`, `coupons`
- **Functions called:** `COALESCE`, `NOW()`, `ROW_COUNT`
- **Schema Qualification Analysis:** **UNQUALIFIED**. Uses `orders`, `order_items`, `products`, `inventory_movements`, `coupons` without `public.` prefix.

### `restock_refunded_item`
- **Schema:** `public` (defined in SQL files)
- **Status in Live DB:** **DOES NOT EXIST** (`pg_proc` returned no records).
- **SQL file definition:**
  ```sql
  CREATE OR REPLACE FUNCTION restock_refunded_item(
    product_id_input UUID,
    quantity_input INT,
    order_id_input UUID
  )
  RETURNS VOID AS $$
  BEGIN
    IF quantity_input <= 0 THEN
      RAISE EXCEPTION 'quantity_input must be greater than zero';
    END IF;

    UPDATE products
    SET stock = stock + quantity_input,
        updated_at = NOW()
    WHERE id = product_id_input;

    INSERT INTO inventory_movements(product_id, order_id, quantity_delta, reason, notes)
    VALUES(product_id_input, order_id_input, quantity_input, 'refund', 'Admin refund restock');
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
- **Schema Qualification Analysis in SQL file:** **UNQUALIFIED** (`UPDATE products`, `INSERT INTO inventory_movements`). Missing `SET search_path = public`.

---

## 4. Real Access Classification (Task 3)

- **`finalize_paid_order` -> `SERVER_ONLY`**
  - Consumed exclusively by `server.ts` webhook handler (`checkout.session.completed`).
  - No frontend or public API caller requires direct invocation.
- **`restock_refunded_item` -> `SERVER_ONLY` (Intended)**
  - Consumed exclusively by `server.ts` admin refund endpoint (`/api/admin/orders/:id/refund`).
  - No client or browser caller requires direct invocation.
- **`decrement_stock` -> `UNUSED`**
  - Redundant with `finalize_paid_order`. Not invoked by `server.ts`.
- **`consume_coupon_after_payment` -> `UNUSED`**
  - Redundant with `finalize_paid_order`. Not invoked by `server.ts`.

---

## 5. Risk Analysis & Threat Modeling (Task 4)

### `decrement_stock`
- **CURRENT EXECUTE:** `anon`, `authenticated`, `service_role`, `PUBLIC`
- **SECURITY DEFINER:** YES
- **RISK:** **CRITICAL**
- **RATIONALE:** Since PostgREST exposes all public schema functions over HTTP RPC, an unauthenticated anonymous user can send `POST /rest/v1/rpc/decrement_stock` with arbitrary `product_id` and `quantity` values. This bypasses checkout, bypasses payments, and drains entire product stocks to 0 (Denial of Inventory Service).

### `finalize_paid_order`
- **CURRENT EXECUTE:** `anon`, `authenticated`, `service_role`, `PUBLIC`
- **SECURITY DEFINER:** YES
- **RISK:** **CRITICAL**
- **RATIONALE:** An anonymous caller can invoke `POST /rest/v1/rpc/finalize_paid_order` directly via PostgREST. If an order exists in `pendiente` status, an attacker knowing the order UUID could finalize the order and trigger stock decrements without completing valid Stripe payment.

### `consume_coupon_after_payment`
- **CURRENT EXECUTE:** `anon`, `authenticated`, `service_role`, `PUBLIC`
- **SECURITY DEFINER:** YES
- **RISK:** **HIGH**
- **RATIONALE:** An anonymous caller can invoke `POST /rest/v1/rpc/consume_coupon_after_payment` via PostgREST to exhaust `current_uses` on any coupon code, burning limited-use discounts for real shoppers.

### `restock_refunded_item`
- **CURRENT EXECUTE:** N/A (Missing)
- **SECURITY DEFINER:** YES (in repo definition)
- **RISK:** **HIGH**
- **RATIONALE:**
  1. Runtime defect: `/api/admin/orders/:id/refund` fails if `restock: true`.
  2. Security risk if created naively: If created without restricting EXECUTE to `service_role`, anonymous users could arbitrarily inflate product stock and insert bogus inventory logs.

---

## 6. Investigation of `restock_refunded_item` (Task 5)

- **Classification:** **`USED_BUT_MISSING`**
- **Evidence:**
  - `server.ts` line 2319 explicitly calls `supabase.rpc('restock_refunded_item', ...)`.
  - The function is present in [`database_schema.sql`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce/database_schema.sql#L363), [`scripts/db/001_selfcare_sinners_production_schema.sql`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce/scripts/db/001_selfcare_sinners_production_schema.sql#L363), and [`scripts/db/002_payment_order_integrity.sql`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce/scripts/db/002_payment_order_integrity.sql#L141).
  - It was omitted or lost during remote database provisioning (possibly when `003_webhook_finalization_resilience.sql` was applied, which recreated `finalize_paid_order` but did not touch `restock_refunded_item`).
  - No trigger or alternative mechanism performs restock upon refund.
- **Action taken:** Function was NOT created. Evidence captured for ChatGPT Web migration design.

---

## 7. Migration Design Recommendations for ChatGPT Web (Non-Executed)

When ChatGPT Web authorizes the remediation migration (e.g. `044_security_definer_critical_functions_hardening.sql`), the recommended structure is:

1. **`finalize_paid_order`:**
   - Add `SET search_path = public;`
   - Explicitly qualify tables: `public.orders`, `public.order_items`, `public.products`, `public.inventory_movements`, `public.coupons`.
   - Permissions:
     ```sql
     REVOKE ALL ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
     GRANT EXECUTE ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) TO service_role;
     ```

2. **`restock_refunded_item`:**
   - Create function with `SECURITY DEFINER SET search_path = public;`
   - Explicitly qualify tables: `public.products`, `public.inventory_movements`.
   - Permissions:
     ```sql
     REVOKE ALL ON FUNCTION public.restock_refunded_item(UUID, INT, UUID) FROM PUBLIC, anon, authenticated;
     GRANT EXECUTE ON FUNCTION public.restock_refunded_item(UUID, INT, UUID) TO service_role;
     ```

3. **`decrement_stock` & `consume_coupon_after_payment`:**
   - Since both are completely unused by runtime code, either:
     - **Option A (Preferred):** `DROP FUNCTION IF EXISTS public.decrement_stock(UUID, INT);` and `DROP FUNCTION IF EXISTS public.consume_coupon_after_payment(TEXT, UUID);`
     - **Option B (Conservative):** If preserved for legacy compatibility, `SET search_path = public;`, qualify tables, and `REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;`.
