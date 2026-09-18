# CURRENT TASK

TASK ID: PL20-01-HOTFIX-REAL-METRIC-CONTRACT
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION

## Objective

Align POST-LAUNCH 20 final scale assessment with real production schema and measured evidence:
1. Fix commercial assessment query to query only valid production columns on `orders` (no `payment_status`).
2. Establish deterministic paid-like order contract (`paid_at IS NOT NULL OR financial_status IN (paid, reconciled) OR status IN (pagado, empacado, enviado, entregado, partially_refunded)`).
3. Compute real commercial metrics: gross revenue, refunded amount, net revenue, AOV, embedding calculation provenance.
4. Eliminate arbitrary and heuristic scores across all criteria (`score: null`).
5. Add `measured_state: 'MEASURED' | 'PARTIAL' | 'NOT_MEASURED'` to operating costs.
6. Enforce evidence-based scale readiness: `finalScaleReady` evaluates strictly to `false` when load capacity and operating costs are unmeasured.
7. Isolate legacy seed rows from active summary counts and evaluation rules.
8. Add 12 permanent contract tests in `tests/api/functional-quality-contracts.test.ts`.

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
- `npm test`: PASS (78/78 tests passed)
- `npm run build`: PASS (Vite + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright tests)
- `.\scripts\qa\validate-release.ps1`: FINAL RESULT PASS (8/8 gates passed)
