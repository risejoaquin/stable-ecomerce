# CURRENT TASK

TASK ID: PL20-03A-REAL-COST-SNAPSHOT-MEASUREMENT-INFRA
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS; PL20-02 PASS / CLOSED; PL20-03 AUTHORIZED / ACTIVE; POST-LAUNCH 20 ACTIVE; PL21 NOT STARTED; finalScaleReady EXPECTED FALSE)

## Objective

Establish durable provider-level operating cost evidence contract and measurement infrastructure without executing production load testing or fabricating missing provider costs:
1. **Formal Transition:** Formally mark PL20-02 as PASS / CLOSED and PL20-03 as ACTIVE.
2. **Provider Cost Contract:** Cover exactly 4 providers: Railway, Supabase, Stripe, Resend. Support amount, currency, period_start, period_end, actual_or_estimated, source_type, provided_by, measured_at, evidence_reference, measured_state, allocation_model, and caveats.
3. **Current Operator Cost Facts:**
   - Railway: 192 MXN/month shared across 4 hosts, `shared_unallocated` (PARTIAL). Never divided by 4 or recorded as 48 MXN.
   - Supabase: Free tier, 0 MXN (MEASURED when free-tier provenance is satisfied).
   - Stripe: ~2.9% fee schedule, conditional 6 MXN fixed fee, actual total unknown (PARTIAL).
   - Resend: Free tier, 0 MXN (MEASURED when free-tier provenance is satisfied).
4. **Zero-Cost Contract:** Zero cost requires explicit free-tier provenance, provider attestation, period, and caveats.
5. **Cost Total & API Safety:** Total cost is MEASURED only when all four providers are MEASURED. Numeric values alone without provenance classify as PARTIAL.
6. **Capacity Measurement Infrastructure:** Reviewed `scripts/load/pl20-baseline.k6.js` with locked production guard, SAFE_READ whitelist, and no production execution.
7. **No Capacity False Positive:** Single-container memory RSS and DB pool connectivity do not alter capacity flags. `CAPACITY_BASELINE_MEASURED = false`, `CAPACITY_SCALE_MEASURED = false`, `isCapacityLoadMeasured = false`.
8. **Trust Boundary Preserved:** PL20-02 request-body CI boundary and origin protection preserved.
9. **Final Scale Ready:** Remains strictly `false`.

## Files modified

- `server.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/01_CURRENT_STATE.md`
- `AGENT_CONTEXT/02_MASTER_ROADMAP.md`
- `AGENT_CONTEXT/03_ACTIVE_PHASE.md`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03a-real-cost-measurement.md`

## Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (116/116 tests passed across 4 files, 99 in functional-quality-contracts)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `npm run qa:release` (`.\scripts\qa\validate-release.ps1`): FINAL RESULT PASS (8/8 gates passed)
- `git diff --check`: PASS (0 whitespace errors)
