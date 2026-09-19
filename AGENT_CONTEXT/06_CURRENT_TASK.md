# CURRENT TASK

TASK ID: PL20-03C-LOCAL-CAPACITY-BASELINE-REPRODUCIBILITY-HOTFIX
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS / CLOSED; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03B PASS / CLOSED; PL20-03 ACTIVE; PL20-03C LOCAL BASELINE REPRODUCIBLE; PL21 NOT STARTED; finalScaleReady EXPECTED FALSE)

## Objective

Execute and harden reproducibility for the first strictly LOCAL PL20 capacity baseline using the approved fail-closed k6 harness:
1. **Committed Compatibility Fix:** Replaced WHATWG `new URL` with a deterministic regex parser in `scripts/load/pl20-baseline.k6.js` (unblocking k6 v2.2.0 Goja engine on Windows amd64).
2. **Safety Guards Preserved:** Loopback only, strict rejection of non-root route paths, rejection of query/fragment (`?` / `#`), strict rejection of forbidden routes (`/checkout`, `/admin`, `/orders`, `/refund`, `/payment`, `/webhook`), and locked production target.
3. **Contract Tests:** Added 10 regression tests in `tests/api/functional-quality-contracts.test.ts` (163/163 test suite pass).
4. **Reproducibility Run (Run 2):** Executed second k6 baseline against exact tree to be committed (35 requests, 0.997 req/s, 0.85ms median latency, 11.27ms p95, 0 crashes, 0 mutations, 0 provider calls, exactly 5 x 503 from `/api/readiness`).
5. **Scale Integrity:** `capacity.local_baseline = MEASURED`. `finalScaleReady` strictly remains `false`. `CAPACITY_SCALE_MEASURED = false`. `isCapacityLoadMeasured = false`.

## Files modified

- `scripts/load/pl20-baseline.k6.js`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03c-local-capacity-baseline-execution.md`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`

## Verification Summary

- k6 Harness Compatibility: PASS (k6 Goja regex URL parser with query/fragment/path rejection)
- Harness Contract Tests (10/10): PASS (163/163 total suite pass)
- Local Build: PASS (`dist/server.cjs` clean)
- Local Reproducibility Run (Run 2): PASS (35 requests, deterministic metrics, 0 side effects)
- Local Baseline State: `capacity.local_baseline = MEASURED`
- `finalScaleReady`: Strictly `false`
