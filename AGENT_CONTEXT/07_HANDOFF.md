# HANDOFF

Previous agent: Codex / Antigravity
Next agent: ChatGPT Web
Phase: POST-LAUNCH 20 — PL20-01 Provenance & Anomaly Contract
Task ID: PL20-01-PROVENANCE-AND-ANOMALY-CONTRACT
Working tree status:
- Base commit: `f4b8cf1e1821f8004e135c1b765d21675b3453ad`
- Branch: `main`
- Status: `READY_FOR_CHATGPT_WEB_VALIDATION`

## Summary of Completed Implementations

1. **Rule 1 (`cancelado + reconciled` Anomaly Contract):**
   - In `commercial-assessment/run`: orders with canceled-like status (`cancelado`, `payment_failed`, `inventory_exception`) having positive financial indicators (`paid_at` or `financial_status in ('paid', 'reconciled')`) are strictly excluded from gross and net revenue.
   - Anomaly details are recorded in `anomalies` array inside evidence JSONB.
   - Sets `measured_state = 'PARTIAL'`.

2. **Rule 2 (`PARTIAL` Operating Costs Contract):**
   - In `GET /api/admin/final-scale/summary`: `isCostEvidenceMeasured` strictly requires `meta?.measured_state === 'MEASURED'`.
   - `PARTIAL` cost estimates do NOT satisfy `finalScaleReady`. `PARTIAL` serves only preliminary review.

3. **Rule 3 (Low Commercial Volume Contract):**
   - In `commercial-assessment/run`: clean low volume orders evaluate to `measured_state = 'MEASURED'` with `score: null` (no arbitrary minimum thresholds or scores).
   - In `investor-readiness/run`: `commercial_track_record` has `status = 'warning'`, `score = null`, with evidence documenting that low volume does not invalidate measurement, but multi-quarter cohort scaling remains unproven.

4. **Rule 4 (`NOT_APPLICABLE` Policy Enforcement):**
   - In `operating-costs/run`: any payload attempting to designate core stack components (Railway, Supabase, Stripe, Resend) as `NOT_APPLICABLE` or `N/A` is rejected with HTTP 400.
   - In `capacity/run`: core capacity dimensions (Railway runtime, Supabase DB, concurrency load testing) cannot be marked `NOT_APPLICABLE` (rejected with HTTP 400).

5. **Rule 5 (Provenance Standard & Baseline Classifier):**
   - In `GET /api/admin/final-scale/summary`: table rows are evaluated by provenance completeness: `measured_state` + `calculation_version` (`'pl20-01-v1'`) + `measured_at` + `source/source_type`.
   - Rows lacking complete provenance are classified as `HISTORICAL_STATIC_BASELINE`, excluded from active counts/rules, and tracked in `historicalBaselineRows`.
   - All PL20 endpoints now consistently persist full V1 provenance metadata.

6. **Permanent Regression Tests:**
   - Tests 13-17 added to `tests/api/functional-quality-contracts.test.ts`.
   - All 83 unit/API tests and 20 E2E tests passing.

## Validation Gates

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (83/83 tests passed across 4 files, 66/66 in functional-quality-contracts)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `.\scripts\qa\validate-release.ps1`: FINAL RESULT PASS (8/8 release gates)
