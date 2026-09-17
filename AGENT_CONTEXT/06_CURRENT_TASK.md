# CURRENT TASK

TASK ID: QA-RELEASE-E-REFUND-INTEGRITY-FINAL-CANDIDATE-20260917
BLOCK: Block C — Refund Integrity Final Remediation Candidate
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION

## Objective

Prepare final remediation candidate for Supabase critical functions and refund integrity per ChatGPT Web architecture decisions (partial refunds supported financially without restock; full refunds supported with atomic, idempotent order-level restock via `restock_refunded_order` and `inventory_restocked_at`) without modifying production Supabase.

## Files in scope

- AGENT_CONTEXT/00_READ_FIRST.md
- AGENT_CONTEXT/01_CURRENT_STATE.md
- AGENT_CONTEXT/02_MASTER_ROADMAP.md
- AGENT_CONTEXT/03_ACTIVE_PHASE.md
- AGENT_CONTEXT/05_ACCEPTANCE_CRITERIA.md
- AGENT_CONTEXT/06_CURRENT_TASK.md
- AGENT_CONTEXT/07_HANDOFF.md
- AGENT_CONTEXT/09_KNOWN_ISSUES.md
- AGENT_CONTEXT/10_DO_NOT_TOUCH.md
- server.ts
- tests/security/critical-functions-security.test.ts
- AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql
- AGENT_CONTEXT/evidence/block-c/2026-09-17-refund-integrity-final-candidate.md

## Completed

1. **Task 1 (Server validation):**
   - In `server.ts` (`POST /api/admin/orders/:id/refund`), added check: if `restock === true && !isFullRefund`, returns `400` with `"Inventory restock is only supported for full order refunds."` BEFORE creating the Stripe refund.
2. **Task 2 (Atomic full refund restock function):**
   - Designed `public.restock_refunded_order(order_id_input UUID)` with `SECURITY INVOKER`, `SET search_path = ''`, qualified `public.*` relations, `FOR UPDATE` order locking, idempotency check on `inventory_restocked_at`, atomic stock increment, row-count verification, `inventory_movements` logging, and `inventory_restocked_at = NOW()`.
   - Permissions: `REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;`.
3. **Task 3 (Schema extension):**
   - Prepared candidate: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_restocked_at TIMESTAMPTZ NULL;`.
4. **Task 4 (`finalize_paid_order` hardening):**
   - Maintained candidate with `SECURITY INVOKER`, `SET search_path = ''`, schema-qualified relations, and execute permissions granted exclusively to `service_role`.
5. **Task 5 (Obsolete functions):**
   - Candidate drops `public.decrement_stock(UUID, INT)` and `public.consume_coupon_after_payment(TEXT, UUID)`.
   - Omitted `restock_refunded_item` (replaced by order-level `restock_refunded_order`).
6. **Task 6 (Server flow):**
   - In `server.ts`, replaced manual `order_items` loop with single RPC call: `supabase.rpc('restock_refunded_order', { order_id_input: id })`.
   - Captures `{ data, error }`, logs error, and throws on failure, preventing false 200 OK responses.
7. **Task 7 & Task 8 (Tests):**
   - Added 15 comprehensive regression and security contract tests in `tests/security/critical-functions-security.test.ts` covering all idempotency, business logic, and security permission criteria.
8. **Task 9 (Migration status):**
   - Candidate SQL preserved under `AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql`.
   - No remote database changes executed.
9. **Task 10 (Validation):**
   - `npm run lint` PASS
   - `npm test` PASS (17/17 tests across 3 files)
   - `npm run build` PASS
   - `npm run qa:release` PASS
   - `git diff --check` PASS
10. **Task 11 (Handoff & Evidence):**
    - Report saved to `AGENT_CONTEXT/evidence/block-c/2026-09-17-refund-integrity-final-candidate.md`.
    - Context files updated.

## Pending / Next Steps for ChatGPT Web

- Review final candidate SQL and server implementation.
- Authorize execution of candidate migration against Supabase production when ready.

## Last command

```text
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/qa/validate-release.ps1
```

## Last result

```text
RELEASE FINAL RESULT: PASS (TypeScript, Unit Tests 17/17, Build, Secret Scan, Resend Webhook, Legacy Upload, Security Baseline, Core Regressions 4/4)
```

## Blockers

- QA / RELEASE E is NOT closed (awaiting ChatGPT Web final authorization).
- Supabase production has not been modified (per strict instruction).
