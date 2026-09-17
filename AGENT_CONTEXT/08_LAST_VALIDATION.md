# LAST VALIDATION

**Timestamp:** 2026-09-17T16:27:53-07:00
**Phase:** QA / RELEASE E — Block C — Apply Supabase Security Remediation to Production
**Target Supabase Project:** `dporfgsbwsyqzmlnqrug`
**Base URL:** `https://selfcaresinners.com`
**Deployed Commit:** `2b9ca57521393b9bbb648a711d90cbd16280e0f3`

## 1. Database Remediation Validation

- Candidate DDL: `AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql`
- Execution: Applied via `scripts/qa/database/apply-remediation-ddl.mjs` (atomic transaction COMMIT).
- `finalize_paid_order`: `SECURITY INVOKER`, `search_path=""`, `acl: {postgres=X/postgres,service_role=X/postgres}` -> PASS.
- `restock_refunded_order`: `SECURITY INVOKER`, `search_path=""`, `acl: {postgres=X/postgres,service_role=X/postgres}` -> PASS.
- `decrement_stock` & `consume_coupon_after_payment`: dropped -> PASS.
- `orders.inventory_restocked_at`: column present, `timestamp with time zone`, nullable -> PASS.
- Anonymous RPC access: Blocked with SQLSTATE `42501` (`permission denied for function`) -> PASS.
- Service role RPC access: Executable without permission errors -> PASS.

## 2. Local Release Gate Validation

Command:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\qa\validate-release.ps1
```

Results:
- TypeScript (`npm run lint`): PASS
- Unit tests (`npm test`): PASS (17/17 tests across 3 files)
- Build (`npm run build`): PASS
- Secret scan: PASS (no committed secrets)
- Resend webhook security: PASS (10/10 checks)
- Legacy upload authorization: PASS (5/5 checks)
- Security baseline report: PASS (SEC-P0-001 PASS, SEC-P1-001 PASS)
- Core regression (`smoke-qa-release-e`): PASS (42/42 checks)
- Core regression (`smoke-mobile-ux-f`): PASS (32/32 checks)
- Core regression (`smoke-post-ux-c-hotfix-20`): PASS (13/13 checks)
- Core regression (`smoke-post-ux-c-hotfix-20-2`): PASS (10/10 checks)
- **FINAL RESULT: PASS**

## 3. Production Smoke Validation

Command:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "2b9ca57521393b9bbb648a711d90cbd16280e0f3"
```

Results:
- `PASS route / -> 200`
- `PASS route /faq -> 200`
- `PASS route /privacy -> 200`
- `PASS route /returns -> 200`
- `PASS route /terms -> 200`
- `PASS route /track -> 200`
- `PASS health status -> ok`
- `PASS deployed commit -> 2b9ca57521393b9bbb648a711d90cbd16280e0f3`
- `PASS admin diagnostics unauthorized boundary -> 401`
- `PASS Content-Security-Policy present`
- `PASS X-Content-Type-Options present`
- `PASS production non-destructive smoke`

## 4. Railway Infrastructure State

- Service: `stable-ecomerce`
- Status: `● Online`
- Health: Active, no 5xx errors, clean pino JSON logging.

Status: **READY_FOR_CHATGPT_WEB_VALIDATION**.
