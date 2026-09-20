# POST-LAUNCH 20 (PL20-03G): Staging Provisioning Preflight

**Date:** 2026-09-19
**Mode:** READ-ONLY PROVIDER VERIFICATION (Zero infrastructure created; zero DB mutations; zero remote load tests)
**Evaluated Main Commit:** `52a48e6f1e36d9ef1d04133989c99c8bda7ddaf6`
**Phase State:** PL20-01 PASS / CLOSED; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03B PASS / CLOSED; PL20-03C PASS / CLOSED; PL20-03D PASS / CLOSED; PL20-03E1 PASS / CLOSED; PL20-03F PASS / CLOSED; PL20-03G PASS / CLOSED; PL20-03 ACTIVE; PL21 NOT STARTED
**`COST_MEASURED`:** Strictly `false` (in-memory dry-run only; zero database persistence)
**`finalScaleReady`:** Strictly `false`
**Decision:** `STAGING_BLOCKED_BY_PROVIDER_LIMIT`
**Result:** `PASS / CLOSED`

---

## 1. Executive Summary & Core Verdicts

Phase **PL20-03G** executed a complete, non-mutating, read-only preflight verification of all external provider capabilities (Supabase, Railway, Stripe, Resend), runtime environment semantics, schema reproducibility, and synthetic seed integrity for the proposed PL20-03F isolated staging architecture.

### Provider Capability Summary

| Provider / Dimension | Preflight Verdict | Operational Findings |
|---|---|---|
| **Supabase** | `SUPABASE_STAGING_REQUIRES_PLAN_CHANGE` | Organization `lucilfer` has 2 active projects (`stable-ecomerce` and `OASIS-DRINKS-DB`). Free plan limit (2 active projects) is 100% occupied. Database branching is unavailable on Free tier. |
| **Railway** | `RAILWAY_STAGING_AVAILABLE` | Workspace `SolidBitsMx` has active pay-as-you-go usage billing ($3.69 current usage, not over limit). Dedicated isolated project via `railway init` is supported with 100% variable isolation. |
| **Stripe** | `TEST_MODE_SUPPORTED` | Account `acct_1TLawpEKfBRabUZ0` supports native test mode keys (`sk_test_...`) and test webhooks pointing to `/api/webhooks/stripe`. No keys exposed; no webhooks registered. |
| **Resend** | `CREDENTIALS_OMITTED_IN_MOCK_MODE` | Application supports `EMAIL_ALLOW_MOCKS=true`. When active, `EmailService` routes sends to internal mock sink without contacting Resend API. |
| **Runtime Environment** | `NODE_ENV=production` REQUIRED | `NODE_ENV !== 'production'` invokes Vite dev server middleware in `server.ts:11871`, destroying capacity measurement fidelity. Staging identity must use domain/project boundaries instead of altering `NODE_ENV`. |
| **Schema Reproducibility** | `SCHEMA_REPRODUCIBLE` | `supabase/migrations/20260918004527_remote_schema.sql` (9,934 lines) provides complete declarative schema with zero live application data. |
| **Seed Static Validation** | `SEED_VALID` | Seed SQL in PL20-03F statically validated against migration DDL. Stores, categories, products INSERT statements are valid; no `category_id`; zero PII; zero production data. |

---

## 2. Task 1 — Design Binding & Migration Evidence Refresh

- **Main Commit Binding:** Evaluated commit is strictly `52a48e6f1e36d9ef1d04133989c99c8bda7ddaf6` (`origin/main`). Commit `31dac2a` is retired.
- **Function Security Model: `finalize_paid_order`:**
  - Verified in canonical migration `supabase/migrations/20260918004527_remote_schema.sql` (lines 6178–6191) and Block C security remediation (`AGENT_CONTEXT/evidence/block-c/`).
  - In Block C, `finalize_paid_order` was intentionally converted from `SECURITY DEFINER` with public execute to **`SECURITY INVOKER`** with immutable empty search path (`SET search_path TO ''`).
  - Access control (lines 9199–9201): `REVOKE ALL ON FUNCTION public.finalize_paid_order(...) FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO postgres, service_role;`.
  - **Finding:** `finalize_paid_order` is **NOT** `SECURITY DEFINER`. It executes with the caller's privileges (`SECURITY INVOKER`) and can only be invoked by `service_role` (server-side webhook processing).
  - PL20-03F staging architecture document updated to eliminate any wording implying `finalize_paid_order` is `SECURITY DEFINER`.

---

## 3. Task 2 — Supabase Staging Availability (READ ONLY)

**Commands Executed:** `npx supabase projects list`, `npx supabase orgs list`, `npx supabase branches list`

```json
{
  "projects": [
    {
      "id": "dporfgsbwsyqzmlnqrug",
      "name": "stable-ecomerce",
      "region": "us-east-1",
      "status": "ACTIVE_HEALTHY",
      "linked": true
    },
    {
      "id": "aklyqyrfhkimxxgbdhqy",
      "name": "OASIS-DRINKS-DB",
      "region": "us-east-2",
      "status": "ACTIVE_HEALTHY",
      "linked": false
    },
    {
      "id": "jfnbxdctljvwueghqlhv",
      "name": "solidbit",
      "region": "us-west-2",
      "status": "INACTIVE",
      "linked": false
    }
  ]
}
```

- **Organization:** `lucilfer` (`bsreuhmlrgoqlowkrsaf`).
- **Quota & Slot Analysis:**
  - Supabase Free plan enforces a quota of **2 active projects** per organization.
  - Organization `lucilfer` currently has **2 active projects** (`stable-ecomerce` and `OASIS-DRINKS-DB`), plus 1 inactive/paused project (`solidbit`).
  - **Does a free slot exist? NO.** Attempting to provision a 3rd active project will be rejected by Supabase API.
- **Database Branching Availability:** `npx supabase branches list` returns `[]`. Database branching is a Pro/Team plan feature requiring GitHub repo integration; it is **unavailable** on the current free account.
- **Applicable Region Choices:** `us-east-1` (same as production), `us-east-2`, `us-west-2`.
- **Verdict:** `SUPABASE_STAGING_REQUIRES_PLAN_CHANGE`.

---

## 4. Task 3 — Railway Staging Availability (READ ONLY)

**Commands Executed:** `railway whoami`, `railway status`, `railway list`, `railway environment list`, `railway usage`

- **Account:** `lucilfer (joaquin.carpio261724@potros.itson.edu.mx)`
- **Workspace:** `SolidBitsMx`
- **Active Project:** `heroic-solace` (`2ee53291-c0b1-4859-9ae6-8e331d1f6435`)
- **Environments in `heroic-solace`:** Strictly 1 environment: `production` (`b4af6a5d-c5fb-45bb-b0c6-b5c13ebb1997`), hosting 4 services (`FULL-METAL-CASH`, `cooperative-connection`, `stable-ecomerce`, `solidbit`).
- **Other Workspace Projects:** `graceful-inspiration`.
- **Provisioning Options:**
  - *Option A (New Environment):* `railway environment new staging` creates an empty environment, but all 4 project services are co-located in the project scope.
  - *Option B (Dedicated Project):* `railway init --name stable-ecomerce-staging --workspace SolidBitsMx` creates an independent project. Provides **100% variable and compute isolation** without any shared environment variables, cross-service links, or risk of production secret inheritance.
- **Billing & Resource Implications:**
  - Workspace operates under pay-as-you-go usage billing (billing period Sep 9 – Oct 9, 2026; current usage $3.69 USD, estimated $7.11 USD; no hard limits, `over limit: no`).
  - Staging containers consume pay-as-you-go compute without requiring a plan upgrade.
  - Railway incremental staging cost = `UNKNOWN / PENDING_OPERATOR_VERIFICATION`.
- **Verdict:** `RAILWAY_STAGING_AVAILABLE`.

---

## 5. Task 4 — Stripe Test Mode Verification (READ ONLY)

**Command Executed:** `stripe config --list`

- **Active Account:** `acct_1TLawpEKfBRabUZ0` (`SolidBit`).
- **Capability:**
  - Standard Stripe accounts natively support test-mode API keys (`pk_test_...` and `sk_test_...`).
  - Supports test-mode webhook endpoints pointing to `/api/webhooks/stripe` (verified in `server.ts:303` with signature verification).
- **Safety Standard:** Zero secret keys exposed. Zero webhook endpoints created.
- **Verdict:** Test mode capability confirmed supported.

---

## 6. Task 5 — Resend Safe Mock Assessment (READ ONLY)

**Source Inspected:** `src/server/email/email-service.ts` lines 20–22, 72–93

- **Implementation:**
  ```typescript
  private shouldAllowMockSend() {
    return process.env.EMAIL_ALLOW_MOCKS === 'true' || process.env.NODE_ENV !== 'production';
  }
  ```
- When `this.resend` is null/undefined and `shouldAllowMockSend()` is true:
  - Generates `providerId: 'mock-${eventId}'`.
  - Logs `[Email Mock]` event.
  - Inserts record into `email_events` with `status: 'mocked'`.
  - Returns `{ success: true, mocked: true, status: 'mocked' }`.
- **Credential Omission Determination:**
  - `RESEND_API_KEY` can be **completely omitted** in staging when `EMAIL_ALLOW_MOCKS=true`.
  - Only `EMAIL_FROM` requires a dummy address (`noreply@staging.local`) for format validation.
  - Zero outbound requests to Resend API. Zero keys created; zero emails sent.

---

## 7. Task 6 — NODE_ENV / Staging Semantics

### 7.1 Application Inspection of `NODE_ENV`
A complete audit of `NODE_ENV` usage across `server.ts` identified:

1. **Vite Development Server Middleware (lines 11871–11878):**
   ```typescript
   if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
     const { createServer: createViteServer } = await import('vite');
     const vite = await createViteServer({
       server: { middlewareMode: true },
       appType: 'spa',
     });
     app.use(vite.middlewares);
   } else {
     // Production static serving from dist/
     const distPath = path.join(process.cwd(), 'dist');
     app.use(express.static(distPath));
     ...
   ```
   **CRITICAL IMPACT:** If `NODE_ENV === 'staging'`, the condition `process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'` evaluates to **`true`**!
   The server would dynamically import Vite and launch Vite development middleware mode instead of serving compiled production assets from `dist/`!
   This results in:
   - On-the-fly TypeScript/JSX compilation on every incoming request.
   - Elimination of static bundle optimizations, asset preloads, and SSR caches.
   - Severe latency degradation and skewed CPU/memory footprints, invalidating capacity test measurements.

2. **Logger Transport (lines 36–45):**
   ```typescript
   ...(process.env.NODE_ENV !== 'production' && {
     transport: { target: 'pino-pretty', options: { colorize: true } }
   })
   ```
   `NODE_ENV=staging` attempts to load `pino-pretty`, adding formatting overhead.

3. **Required Production Environment Validation (lines 92–97):**
   When `isProduction` (`NODE_ENV === 'production'`) is true, `server.ts` checks `requiredProductionEnv`. For staging, non-operational dummy strings for `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` (e.g. `re_mock_staging_only`, `whsec_mock_staging_only`) satisfy the startup guard while `EMAIL_ALLOW_MOCKS=true` guarantees mock dispatch.

### 7.2 Staging Identity Recommendation
- **Fidelity Recommendation:** Staging must execute with **`NODE_ENV=production`** to preserve production runtime behavior, compiled static assets, and capacity measurement accuracy.
- **/api/health Compatibility:** `/api/health` reports `environment: process.env.NODE_ENV`. Under `NODE_ENV=production`, it will return `"environment": "production"`.
- **Identity Mechanism:** Do NOT alter `NODE_ENV` merely to make `/api/health` say `"staging"`. Staging identity is established cleanly via:
  1. `APP_URL` / hostname boundary (`https://staging-web.up.railway.app` or `https://staging.selfcaresinners.com`).
  2. Railway project identity (`stable-ecomerce-staging`).
  3. Staging Supabase project URL ref (distinct from `dporfgsbwsyqzmlnqrug`).
  4. Non-breaking header/env variable if needed in the future (e.g. `APP_INSTANCE_TIER=staging`), without touching `NODE_ENV`.

---

## 8. Task 7 — Schema Reproducibility

- **Canonical Schema Source:** `supabase/migrations/20260918004527_remote_schema.sql` (511,068 bytes, 9,934 lines).
- **Contents:**
  - Extensions: `unaccent`, `uuid-ossp`, `pgcrypto`.
  - Tables: All public tables, sequences, primary keys, unique constraints, and check constraints.
  - Functions: All stored procedures and RPCs (`finalize_paid_order` as `SECURITY INVOKER`, `consume_coupon_after_payment`, `decrement_stock`, `restock_refunded_item`).
  - Security: Row Level Security enabled across all tables, all RLS policies, table grants, and function execution privileges.
  - Data: **Zero application data, zero customer records, zero orders.**
- **Reproducibility Verdict:** Verified clean declarative schema capable of initializing a fresh isolated PostgreSQL instance from scratch. No database execution occurred during this preflight.

---

## 9. Task 8 — Seed Static Verification

The minimal synthetic seed defined in PL20-03F was statically validated against table DDLs in `20260918004527_remote_schema.sql`:

1. **`public.stores` INSERT:**
   - DDL columns: `id`, `name`, `slug`, `status`, `created_at`, `updated_at`.
   - Seed values: `'11111111-1111-4111-8111-111111111111'::uuid`, `'Selfcare Sinners Staging'`, `'selfcare-sinners'`, `'active'`.
   - Constraints: `stores_pkey` (valid UUID), `stores_slug_key` (unique, handled via `ON CONFLICT (slug) DO NOTHING`), `stores_status_check` (`'active'` is in allowed array).
   - **Status: VALID.**

2. **`public.categories` INSERT:**
   - DDL columns: `id`, `store_id`, `name`, `slug`, `is_active`, `created_at`, `updated_at`.
   - Seed values: `'22222222-2222-4222-8222-222222222222'::uuid`, store UUID, `'Staging Category'`, `'staging-category'`, `true`.
   - Constraints: `categories_pkey` (valid UUID), `categories_store_id_slug_key` (handled via `ON CONFLICT (store_id, slug) DO NOTHING`).
   - **Status: VALID.**

3. **`public.products` INSERT:**
   - DDL columns: `id`, `store_id`, `name`, `slug`, `description`, `price`, `cost`, `stock`, `status`, `is_featured`, `category`, `categories`, `created_at`, `updated_at`.
   - Seed values: 3 synthetic products (`synthetic-serum-a`, `synthetic-cream-b`, `synthetic-cleanser-c`) with prices `299.00`, `450.00`, `199.00`, status `'active'`, stock `100`, `50`, `200`.
   - `category_id` Check: **CONFIRMED: `products` table has NO `category_id` column.** Products declare `category` (text) and `categories` (jsonb). The seed correctly avoids `category_id`.
   - Constraints: `products_pkey` (valid UUID), `products_price_check` (>= 0), `products_stock_check` (>= 0), `products_status_check` (`'active'` allowed), `products_store_id_slug_key` (handled via `ON CONFLICT (store_id, slug) DO NOTHING`).
   - **Status: VALID.**

4. **Data Isolation Rules:**
   - Zero customer records. Zero orders or order items. Zero payment tokens. Zero PII.
   - **Status: 100% COMPLIANT.**

---

## 10. Expected Staging Cost Status

- **Railway:**
  Railway incremental staging cost = `UNKNOWN / PENDING_OPERATOR_VERIFICATION`.
- **Supabase:**
  Supabase Free account has 2/2 active project slots occupied.
  Supabase staging requires either:
  - free an active project slot
  - or operator-approved plan change
- **Stripe:**
  Stripe test mode = $0.00.
- **Resend:**
  Resend mock mode = $0.00 (`EMAIL_ALLOW_MOCKS=true`).

---

## 11. Task 9 — Formal Decision

```text
STAGING_BLOCKED_BY_PROVIDER_LIMIT
```

### Primary Blocker:
Supabase Free account has 2/2 active project slots occupied. Organization `lucilfer` (`bsreuhmlrgoqlowkrsaf`) currently runs two active projects (`stable-ecomerce` and `OASIS-DRINKS-DB`). Attempting to provision a 3rd active database project is blocked by Supabase account quota.

### Unblocking Paths for Operator:
Supabase staging requires either:
- free an active project slot
- or operator-approved plan change

---

## 12. State Invariants Maintained

- `COST_MEASURED`: Strictly `false`.
- `finalScaleReady`: Strictly `false`.
- Infrastructure: Zero containers, databases, or webhooks provisioned.
- Phase: PL20-01..PL20-03G PASS / CLOSED; PL20-03 ACTIVE; PL21 NOT STARTED.
- Git: Synchronized with `origin/main` at `52a48e6f1e36d9ef1d04133989c99c8bda7ddaf6`.
