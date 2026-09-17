# Production Evidence: Supabase Security Remediation & Function Hardening

**Date:** 2026-09-17
**Scope:** QA / RELEASE E — Block C — Apply Supabase Security Remediation to Production
**Target Supabase Project:** `dporfgsbwsyqzmlnqrug`
**Production URL:** `https://selfcaresinners.com`
**Commit Deployed:** `2b9ca57521393b9bbb648a711d90cbd16280e0f3`
**Status:** READY_FOR_CHATGPT_WEB_VALIDATION

---

## 1. Executive Summary

In accordance with ChatGPT Web authorized instructions, the security remediation candidate SQL (`AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql`) was applied atomically to the production Supabase project `dporfgsbwsyqzmlnqrug`.

Key security outcomes achieved:
1. **`finalize_paid_order` hardened:** Converted from vulnerable `SECURITY DEFINER` with public execution permissions to `SECURITY INVOKER`, explicit immutable `SET search_path = ''`, fully qualified `public.*` table references, and permissions restricted exclusively to `service_role` (revoked from `PUBLIC`, `anon`, and `authenticated`).
2. **`restock_refunded_order` created:** Created atomic, idempotent order-level restocking function with `SECURITY INVOKER`, `SET search_path = ''`, qualified relations, order-level `FOR UPDATE` locking, idempotency check on `orders.inventory_restocked_at`, row-count validation, inventory movement logging, and permissions granted solely to `service_role`.
3. **Obsolete attack-surface functions dropped:** Removed `public.decrement_stock(UUID, INT)` and `public.consume_coupon_after_payment(TEXT, UUID)`.
4. **Schema extension applied:** Column `inventory_restocked_at TIMESTAMPTZ NULL` added to `public.orders`.
5. **Runtime security enforced:** Verified via live RPC tests that anonymous/unauthenticated callers are blocked with SQLSTATE `42501` (`permission denied for function`), while `service_role` maintains authorized execution.
6. **Full application regression validated:** Local release gate passed (TypeScript, Unit tests 17/17, Build, Secrets, Security baseline, Core regressions 4/4 suites).
7. **Production smoke verified:** Railway production service confirmed healthy with deployed commit matching `2b9ca57`, zero server errors, and passing end-to-end non-destructive smoke suite.

---

## 2. Preflight State (Live Production Database)

Prior to execution, live database inspection confirmed:
- `finalize_paid_order`: Existed as `SECURITY DEFINER` (`prosecdef: true`), with default ACL granting execute to `PUBLIC`, `anon`, and `authenticated`.
- `decrement_stock`: Existed in public schema.
- `consume_coupon_after_payment`: Existed in public schema.
- `restock_refunded_order`: Did not exist.
- `orders.inventory_restocked_at`: Column did not exist.

---

## 3. Controlled DDL Execution

The remediation SQL was executed in a single atomic transaction using `scripts/qa/database/apply-remediation-ddl.mjs`:

```text
Beginning atomic DDL transaction...
Executing candidate SQL statements...
Committing transaction...
SUCCESS: Remediation DDL applied atomically.
```

Candidate SQL file: `AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql`.

---

## 4. Post-DDL Database Inspection

Verified via `scripts/qa/database/validate-post-remediation.mjs`:

```json
{
  "functions": [
    {
      "name": "finalize_paid_order",
      "is_security_definer": false,
      "search_path_config": "search_path=\"\"",
      "raw_acl": "{postgres=X/postgres,service_role=X/postgres}",
      "has_public_execute": false,
      "has_anon_execute": false,
      "has_authenticated_execute": false,
      "has_service_role_execute": true
    },
    {
      "name": "restock_refunded_order",
      "is_security_definer": false,
      "search_path_config": "search_path=\"\"",
      "raw_acl": "{postgres=X/postgres,service_role=X/postgres}",
      "has_public_execute": false,
      "has_anon_execute": false,
      "has_authenticated_execute": false,
      "has_service_role_execute": true
    }
  ],
  "schema": {
    "column_name": "inventory_restocked_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
}
```

Findings:
- `finalize_paid_order`: `is_security_definer: false`, `search_path=""`, execute restricted to `service_role` and `postgres`.
- `restock_refunded_order`: `is_security_definer: false`, `search_path=""`, execute restricted to `service_role` and `postgres`.
- `decrement_stock` & `consume_coupon_after_payment`: 0 rows returned (cleanly dropped).
- `public.orders.inventory_restocked_at`: column present, `timestamp with time zone`, nullable.

---

## 5. Security & Boundary Verification

### 5.1. Anonymous Access Test (`test-anon-function-access.mjs`)

Live invocation of functions using Supabase anonymous client (`anon` key):

```json
{
  "finalize_paid_order": {
    "error": {
      "code": "42501",
      "message": "permission denied for function finalize_paid_order"
    },
    "blocked": true
  },
  "restock_refunded_order": {
    "error": {
      "code": "42501",
      "message": "permission denied for function restock_refunded_order"
    },
    "blocked": true
  },
  "decrement_stock": {
    "error": {
      "code": "PGRST202",
      "message": "Could not find the function public.decrement_stock(product_id, quantity) in the schema cache"
    },
    "blocked": true
  },
  "consume_coupon_after_payment": {
    "error": {
      "code": "PGRST202",
      "message": "Could not find the function public.consume_coupon_after_payment(coupon_code_input, store_id_input) in the schema cache"
    },
    "blocked": true
  }
}
```

**Result: PASS.** All critical RPCs are completely blocked to unauthenticated callers.

### 5.2. Service Role Access Test (`test-service-role-access.mjs`)

Live invocation of functions using backend `service_role` client:

```text
service_role finalize_paid_order: {
  success: true,
  error: null,
  data: [ { success: false, final_status: 'missing', message: 'ORDER_NOT_FOUND' } ],
  count: null,
  status: 200,
  statusText: 'OK'
}

service_role restock_refunded_order: {
  success: false,
  error: {
    code: 'P0001',
    details: null,
    hint: null,
    message: 'ORDER_NOT_FOUND: order 00000000-0000-0000-0000-000000000000 does not exist'
  },
  data: null,
  count: null,
  status: 400,
  statusText: 'Bad Request'
}
```

**Result: PASS.** `service_role` executes both functions without permission barriers (returned business logic errors for dummy UUID, not SQLSTATE `42501`).

---

## 6. Application Regression Gates

The complete release gate was executed locally via `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\qa\validate-release.ps1`:

| Gate | Status | Details |
|---|---|---|
| TypeScript | PASS | `tsc --noEmit` exited 0 |
| Unit Tests | PASS | 17/17 tests passing across 3 test suites |
| Build | PASS | Vite + Esbuild bundle generated in 5.67s |
| Secret Scan | PASS | No committed live secrets |
| Resend Webhook Security | PASS | 10/10 signature & security checks pass |
| Legacy Upload Authorization | PASS | 5/5 role & middleware checks pass |
| Security Baseline Report | PASS | SEC-P0-001 PASS, SEC-P1-001 PASS |
| Core Regression: smoke-qa-release-e | PASS | 42/42 checks pass |
| Core Regression: smoke-mobile-ux-f | PASS | 32/32 checks pass |
| Core Regression: smoke-post-ux-c-hotfix-20 | PASS | 13/13 checks pass |
| Core Regression: smoke-post-ux-c-hotfix-20-2 | PASS | 10/10 checks pass |
| **RELEASE FINAL RESULT** | **PASS** | `summary.md` generated cleanly |

---

## 7. Production Validation

### 7.1. Production Smoke Script

Executed: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "2b9ca57521393b9bbb648a711d90cbd16280e0f3"`

```text
PASS route / -> 200
PASS route /faq -> 200
PASS route /privacy -> 200
PASS route /returns -> 200
PASS route /terms -> 200
PASS route /track -> 200
PASS health status -> ok
PASS deployed commit -> 2b9ca57521393b9bbb648a711d90cbd16280e0f3
PASS admin diagnostics unauthorized boundary -> 401
PASS Content-Security-Policy present
PASS X-Content-Type-Options present
PASS production non-destructive smoke
```

### 7.2. Railway Deployment & Health

- Service: `stable-ecomerce`
- Status: `● Online`
- Deployed Commit: `2b9ca57521393b9bbb648a711d90cbd16280e0f3`
- Railway Logs: Clean HTTP 200 / 304 traffic; no 5xx errors; no unhandled exceptions.

---

## 8. Artifacts and Automation Scripts Added

- `AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql` (remediation SQL)
- `scripts/qa/database/apply-remediation-ddl.mjs` (atomic DDL applicator)
- `scripts/qa/database/validate-post-remediation.mjs` (schema & permission inspector)
- `scripts/qa/database/test-anon-function-access.mjs` (unauthenticated boundary test)
- `scripts/qa/database/test-service-role-access.mjs` (service_role invocation test)
- `tests/security/critical-functions-security.test.ts` (15 regression and security tests)

---

## 9. Conclusion

The Supabase critical function remediation and refund integrity enforcement have been applied and validated end-to-end in production.

Final Status: **READY_FOR_CHATGPT_WEB_VALIDATION**.
