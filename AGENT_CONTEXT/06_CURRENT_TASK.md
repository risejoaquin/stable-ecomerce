# CURRENT TASK

TASK ID: PL20-01-PROVENANCE-AND-ANOMALY-CONTRACT
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION

## Objective

Implement the five core architectural and evidence rules defined by ChatGPT Web for PL20-01:
1. **Anomaly Conflict Contract (`cancelado + reconciled`):** Orders with canceled/failed statuses combined with positive payment indicators (`paid_at` or `financial_status` in `paid`/`reconciled`) are strictly excluded from paid-like revenue, recorded in the `anomalies` array, and mark commercial assessment `measured_state = 'PARTIAL'`.
2. **Partial Operating Costs Contract:** `PARTIAL` cost estimates serve only for preliminary review and strictly do NOT satisfy `finalScaleReady`. `finalScaleReady` requires `measured_state === 'MEASURED'` across required costs.
3. **Low Commercial Volume Contract:** Commercial metrics can be `MEASURED` with `score: null` without inventing arbitrary minimum order thresholds. Low volume does not invalidate measurement, but does not prove multi-quarter cohort scaling (`commercial_track_record = 'warning'`).
4. **`NOT_APPLICABLE` Rejection Policy:** Core production stack components (Railway, Supabase, Stripe, Resend) and core load capacity dimensions cannot be marked `NOT_APPLICABLE` (strictly rejected with HTTP 400).
5. **Provenance-Based Baseline Classifier:** Replaced substring-based filtering with complete V1 provenance validation (`measured_state` + `calculation_version` `'pl20-01-v1'` + `measured_at` + `source/source_type`). Records lacking complete provenance are classified as `HISTORICAL_STATIC_BASELINE` and tracked in `historicalBaselineRows`.
6. **Test Coverage:** Added permanent regression tests (tests 13-17 in `tests/api/functional-quality-contracts.test.ts`) covering all 5 rules.

## Files modified

- `server.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-18-pl20-01-hotfix-real-metric-contract.md`

## Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (83/83 tests passed across 4 files, 66/66 in functional-quality-contracts)
- `npm run build`: PASS (Vite + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright tests)
- `.\scripts\qa\validate-release.ps1`: FINAL RESULT PASS (8/8 gates passed)
