# Stable-Ecommerce — Controlled Audit Remediation (2026-10-15)

**Status:** WAVE 1 / DRAFT REVIEW REQUIRED. No production migration, PR merge, payment activation, or Railway deploy is authorized by this change.
**Base:** `main` at `37ba8bb6f8eec76bc88a20e429ecbed956462902`.
**Input:** External forensic audit dated 2026-10-15 and four implementation attachments; proposals are untrusted until checked against this revision.

## Preservation of frozen decisions

- `DR-INV-001`: `sellable_units` is the single transactional inventory authority. `products.stock` and `products.variants[*].stock` are legacy/advisory; do not make them competing ledgers.
- `DR-PAY-001`, `DR-IDEM-001`, `DR-AUTH-001`, `DR-ERR-001`, `DR-REC-001` remain frozen.
- POS contract: `POST /api/pos/sales` with durable idempotency, payment ledger, and atomic stock; do not introduce parallel `/api/admin/pos/orders`.
- Keep Client 01 single-store, online Web POS only; social commerce activation is out of scope for Client 01.
- Review all contract changes with RFC/ADR before modifying accepted interfaces. Never merge without cross-review; owner of PR cannot self-approve.

## Verified from repository (code inspection, not production DB validation)

| ID | Assessment | Action / blocker |
| --- | --- | --- |
| C-01 | Legacy `finalize_paid_order` decrements `products.stock`, not per-unit stock; migration for `sellable_units` exists. | P0: inventory authority / order finalization refactor and concurrent PostgreSQL tests, coordinated with CCP-12 and PR #35. |
| C-02 | Existing `src/pages/pos/PosRegisterPage.tsx` is currently an isolated mock and a POS namespace guard exists. | Finish existing canonical POS flow; do not copy incompatible audit implementation. |
| C-03 | Audit cites social modules not present on `main`. | Re-evaluate against correct commit and scope; no premature activation. |
| C-04 | Legacy migrations contain privileged functions; a security hardening candidate already exists under `AGENT_CONTEXT/evidence/block-c/`; `sellable_units` migration has RLS. | P0: read-only DB permission inventory, review SECURITY DEFINER ACLs and search paths; phased least-privilege migration, never blanket REVOKE. |
| A-01 | Coupon UI sends `fixed_amount`, SQL requires `fixed`. | Fixed in wave 1 with cross-layer regression test. |
| A-02 | Legacy checkout only checks `products.stock`. | P0: server-side, transactional sellable-unit reservation/finalization design before Stripe cutover. Frontend-only check is not sufficient. |
| M-02 | Two client hooks accepted expired JWTs. | Fixed in wave 1; client decoder is not a signature verifier; server authorization remains mandatory. |
| M-03 | Email worker can be invoked manually; audit's proposed function parameters mismatch the real worker. | Design a single safe recurring worker with durable claims, retries and lifecycle control; separately test before enabling. |

## Release-blocking gates

1. Reproduce P0 issues in local/CI PostgreSQL using exact live-schema-compatible migration snapshots, **without production DB writes**.
2. Validate `sellable_units` backfill, stable migrations, and migration checksums against the current database; stage first.
3. Verify atomic order finalization + restoration under multiple concurrent clients, retries, partial failures, insufficient stock, refunds, and duplicate webhooks.
4. Assert no unauthorized `anon` / `authenticated` EXECUTE on finance / inventory-definer RPCs. Preserve explicit public storefront read grants and RLS boundaries.
5. Verify `npm run lint`, `npm test`, `npm run build`, secret scan, core regressions and E2E tests in GitHub Actions.
6. Require reviewer other than PR author (Julián / Joaquín cross-review) and explicit GO/NO-GO for merge, migration, production payment effects and deployment.

## Current wave deliverables

- Standardized client-side JWT expiration and malformed-token handling across UI hooks, with tests.
- Corrected fixed-amount coupon enum to match SQL and added contract regression test.
- NO-GO on merging the audit's monolithic SQL `044` and on enabling new real integrations.
- Production Smoke on `main` was failing when inspected; investigate this separately before release.

## Follow-up execution order

1. P0 SQL inventory / finance convergence including PR #35 compatibility.
2. P0 privilege audit + security migration with staging rollback drills.
3. P0 checkout and refund behavioral integration tests.
4. M-03 controlled email worker plus concurrency/restart tests.
5. POS UI activation only after its canonical API is implemented and approved.
6. Social inventory and processing reevaluation in its own scope.
