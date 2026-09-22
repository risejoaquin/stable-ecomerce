# CURRENT TASK

TASK ID: PL20-03J-ISOLATED-STAGING-CAPACITY-SCALE-CHARACTERIZATION
PHASE: POST-LAUNCH 20
STATUS: PL20-03J PASS / CLOSED (PL20-01..PL20-03J PASS / CLOSED; PL20-03 ACTIVE; PL21 NOT STARTED; CAPACITY_SCALE_MEASURED = true; CAPACITY_BASELINE_MEASURED = true; COST_MEASURED = false; finalScaleReady = false)

## Objective

Measure how the existing SAFE_READ workload behaves as concurrency increases (2 VUs, 5 VUs, 10 VUs for 60s each with 1s sleep) against the isolated staging environment (`https://web-staging-production-8fb1.up.railway.app`):
1. **Target Safety Lock (Task 1):** Verified staging target lock in `scripts/load/pl20-scale.k6.js`. Target set strictly to `https://web-staging-production-8fb1.up.railway.app`. Hard-coded production abort guard enforced.
2. **Pre-Flight Snapshot (Task 1, 6, 8):**
   - HEAD: `6225e50eecc4aafffa69f969559518acdb2a7c63` (matches origin/main).
   - Staging `/api/health` and `/api/readiness`: HTTP 200 OK.
   - Pre-scale DB counts: stores=1, categories=1, products=3, orders=0, order_items=0, customer_metrics=0, auth.users=0.
   - Railway baseline: CPU `0.0022 vCPU` (0.0%), Memory `90.35 MB` (1.1%).
   - Supabase connection baseline: 13 active connections.
3. **Stage A (2 VUs, 60s) (Task 3):** 98 requests, 1.5242 RPS, 0.00% failure rate, 0 5xx, p50: 243.12ms, p95: 539.90ms, max: 893.55ms. All safety checks passed.
4. **Stage B (5 VUs, 60s) (Task 3):** 245 requests, 3.8215 RPS, 0.00% failure rate, 0 5xx, p50: 243.95ms, p95: 570.62ms, max: 895.18ms. All safety checks passed.
5. **Stage C (10 VUs, 60s) (Task 3):** 490 requests, 7.7850 RPS, 0.00% failure rate, 0 5xx, p50: 234.53ms, p95: 423.28ms, max: 635.40ms. All safety checks passed.
6. **Data Integrity Audit (Task 8):** Post-scale staging Supabase verified: stores=1, categories=1, products=3, orders=0, order_items=0, customer_metrics=0, auth.users=0. Delta = 0.
7. **Production Isolation Audit (Task 7):** No production target configured in load harness; no production mutations or provider side effects observed; production cross-talk not observed.
8. **Resource Utilization (Task 6):** Observed memory utilization was ~2.5% of the configured 8192 MB limit (peak 204.39 MB); peak observed CPU was 0.0396 vCPU relative to the configured 8.0 vCPU limit (unused resource is not inferred as proven linear capacity); Supabase active connections stayed flat at 13 (limit: 60/role).
9. **Documentation & Closure (Tasks 11, 12, 13):** Generated `pl20-03j-capacity-scale-summary.json` (no unproven timestamps) and `2026-09-21-pl20-03j-capacity-scale-characterization.md`. Formally closed PL20-03J with CAPACITY_SCALE_MEASURED = true accepted.

## Files Modified / Created

- `scripts/load/pl20-scale.k6.js` (created)
- `AGENT_CONTEXT/evidence/post-launch-20/pl20-03j-stage-2vu-summary.json` (created)
- `AGENT_CONTEXT/evidence/post-launch-20/pl20-03j-stage-5vu-summary.json` (created)
- `AGENT_CONTEXT/evidence/post-launch-20/pl20-03j-stage-10vu-summary.json` (created)
- `AGENT_CONTEXT/evidence/post-launch-20/pl20-03j-capacity-scale-summary.json` (created)
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-21-pl20-03j-capacity-scale-characterization.md` (created)
- `AGENT_CONTEXT/06_CURRENT_TASK.md` (updated)
- `AGENT_CONTEXT/07_HANDOFF.md` (updated)
- `AGENT_CONTEXT/08_LAST_VALIDATION.md` (updated)
- `AGENT_CONTEXT/13_CHANGELOG.md` (updated)

## Verification Summary

- Target: `https://web-staging-production-8fb1.up.railway.app`
- Workload: SAFE_READ (7 routes, 1s sleep)
- Concurrency Stages: 2 VUs (1.52 RPS) -> 5 VUs (3.82 RPS) -> 10 VUs (7.78 RPS)
- Total Requests: 833 requests, 0 HTTP failures (0.00%), 0 HTTP 5xx
- Latency (10-VU): p50: 234.53ms, p95: 423.28ms, max: 635.40ms
- Data Integrity: 100% matched (zero mutations)
- Production Isolation: 100% PASS (zero cross-talk)
- State: `PL20-03J PASS / CLOSED`
- `CAPACITY_SCALE_MEASURED = true`
- Confirmed Invariants: `COST_MEASURED = false`, `finalScaleReady = false`
- Phase Governance: PL20-03 ACTIVE; PL21 NOT STARTED
