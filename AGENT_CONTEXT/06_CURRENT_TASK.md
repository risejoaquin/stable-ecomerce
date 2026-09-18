# CURRENT TASK

TASK ID: QA-RELEASE-E-SUPABASE-BASELINE-20260917
BLOCK: Block C — Supabase Baseline Adoption & Reproducibility
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION

## Objective

Adopt the production Supabase remote schema as the tracked initial repository baseline using official Supabase CLI tooling (`npx --yes supabase link` + `npx --yes supabase db pull`), verify remote migration history synchronization, review generated baseline SQL for destructive/leak statements, reproduce local database schema reconstruction from empty state via `supabase start` and `supabase db reset --local`, execute exhaustive schema and function security comparison against production, run database linting and advisors, and validate application health.

## Files in scope

- `supabase/config.toml`
- `supabase/.gitignore`
- `supabase/migrations/20260918004527_remote_schema.sql`
- `scripts/qa/database/inspect-remote-baseline.mjs`
- `tests/api/health.test.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-baseline-reproducibility.md`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`

## Completed

1. **Step 1 (Link Project):**
   - Verified Docker Desktop `29.7.2` (WSL2 engine) running and Supabase CLI `2.117.0`.
   - Executed `npx --yes supabase link --project-ref dporfgsbwsyqzmlnqrug` cleanly without printing or persisting credentials.
2. **Step 2 (Verify Link & Pre-pull History):**
   - Verified `npx --yes supabase migration list`: both local and remote migration histories were empty (`[]`).
3. **Step 3 (Official Baseline Pull):**
   - Executed official workflow `npx --yes supabase db pull`. Shadow database initialized via Docker (`supabase/postgres:17.6.1.141`).
   - Generated initial baseline migration: `supabase/migrations/20260918004527_remote_schema.sql` (9,935 lines, 510KB).
4. **Step 4 (Remote History Verification):**
   - Verified `npx --yes supabase migration list`: version `20260918004527` recorded as applied in both local and remote history.
5. **Step 5 (Baseline Review):**
   - Verified: 0 DROP statements, 0 INSERT statements with production data, 0 TRUNCATE/DELETE statements, 0 credentials/secrets, 0 internal auth/storage leaks.
6. **Step 6 (Critical Production State Verification):**
   - Verified `public.finalize_paid_order`: `SECURITY INVOKER`, `search_path=''`, schema-qualified relations, execute restricted to `service_role` and `postgres`.
   - Verified `public.restock_refunded_order`: `SECURITY INVOKER`, `search_path=''`, qualified relations, execute restricted to `service_role` and `postgres`.
   - Verified `public.orders.inventory_restocked_at`: `timestamp with time zone NULL`.
   - Confirmed obsolete functions `decrement_stock` and `consume_coupon_after_payment` are completely absent.
7. **Step 7 (Local Reproduction):**
   - Started local Supabase stack via `npx --yes supabase start`.
   - Reconstructed local schema from clean empty state via `npx --yes supabase db reset --local`. Zero errors during recreation.
8. **Step 8 (Critical Schema Comparison):**
   - Programmatically compared all 10 critical tables (`stores`, `users`, `products`, `orders`, `order_items`, `inventory_movements`, `coupons`, `stripe_events`, `audit_logs`, `order_timeline`) across columns, types, nullability, constraints, RLS status, and policies: 100% MATCH.
   - Handled default ACL difference by explicitly revoking execute from `anon` and `authenticated` on `finalize_paid_order` and `restock_refunded_order`, achieving 100% parity with remote proacl (`{postgres=X/postgres,service_role=X/postgres}`).
   - Verified runtime boundary enforcement on local database: anonymous RPC calls return SQLSTATE `42501` (`permission denied`), `service_role` calls succeed.
   - Total differences: 0.
9. **Step 9 (Advisors & Lint):**
   - `supabase db lint --local`: 0 schema errors.
   - `supabase db lint --linked`: 0 schema errors.
   - `supabase db advisors --linked --type security`: Clean on critical functions; pre-existing legacy functions flagged as expected under SEC-018/SEC-019.
   - `supabase db advisors --linked --type performance`: Duplicate indexes identified on `orders` and `products`.
10. **Step 10 & 11 (Cleanup & Validation):**
    - Secret scanner: PASS (0 secrets detected).
    - `git diff --check`: PASS (0 whitespace issues).
    - `npm run lint`: PASS (0 errors).
    - `npm test`: PASS (24/24 unit/API tests).
    - `npm run build`: PASS (Vite client + esbuild server bundle in 6.43s).
    - `npm run qa:fast`: PASS.
    - `npm run qa:release`: PASS (all 8 release gates passed).
11. **Step 12 (Evidence Documentation):**
    - Documented complete technical evidence in `AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-baseline-reproducibility.md`.

## Pending / Next Steps for ChatGPT Web

- Review Supabase baseline adoption evidence.
- Review and authorize staging/commit of tracked baseline files (`supabase/`, `scripts/qa/database/inspect-remote-baseline.mjs`, `tests/api/`, context files).
- Do NOT close QA / RELEASE E without explicit instruction.

## Last command

```text
.\scripts\qa\validate-release.ps1
```

## Last result

```text
========================================
SELFCARE SINNERS - RELEASE GATE
TypeScript                     PASS
Unit tests                     PASS
Build                          PASS
Secret scan                    PASS
Resend webhook security        PASS
Legacy upload authorization    PASS
Security baseline report       PASS
Core regression                PASS
FINAL RESULT                   PASS
========================================
```

## Blockers

- None. Baseline reproducibility verified and ready for ChatGPT Web review.
