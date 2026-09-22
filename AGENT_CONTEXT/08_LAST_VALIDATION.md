# LAST VALIDATION

**Timestamp:** 2026-09-21T18:55:00-07:00
**Phase:** POST-LAUNCH 20 (PL20-03J Isolated Staging Capacity Scale Characterization)
**Branch:** `main`
**Base Commit:** `6225e50eecc4aafffa69f969559518acdb2a7c63`
**Deployed Staging Commit:** `6225e50eecc4aafffa69f969559518acdb2a7c63`

## 1. Validation & Test Suite Status

| Gate / Assessment | Command / Source | Result | Status |
|---|---|---|---|
| Target Safety Lock | `scripts/load/pl20-scale.k6.js:91` | Hard-coded production abort guard active | PASS |
| Target Hostname Verification | Parameter audit | `https://web-staging-production-8fb1.up.railway.app` strictly targeted | PASS |
| Pre-Run Health Probe | `GET /api/health` | HTTP 200 OK, version `6225e50eecc4aafffa69f969559518acdb2a7c63` | PASS |
| Pre-Run Readiness Probe | `GET /api/readiness` | HTTP 200 OK, Supabase `ok: true` (265ms) | PASS |
| Stage A k6 (2 VUs, 60s) | `k6 run scripts/load/pl20-scale.k6.js` | 98 reqs, 1.52 RPS, 0 failures, p50 243.12ms, p95 539.90ms | PASS |
| Between-Stage A->B Probes | `GET /api/health` & `/api/readiness` | Both HTTP 200 OK, Railway deployment continuous | PASS |
| Stage B k6 (5 VUs, 60s) | `k6 run scripts/load/pl20-scale.k6.js` | 245 reqs, 3.82 RPS, 0 failures, p50 243.95ms, p95 570.62ms | PASS |
| Between-Stage B->C Probes | `GET /api/health` & `/api/readiness` | Both HTTP 200 OK, Railway deployment continuous | PASS |
| Stage C k6 (10 VUs, 60s) | `k6 run scripts/load/pl20-scale.k6.js` | 490 reqs, 7.78 RPS, 0 failures, p50 234.53ms, p95 423.28ms | PASS |
| Aggregate HTTP Failure Rate | k6 metrics across all stages | 0.00% (0 / 833 requests failed) | PASS |
| Aggregate HTTP 5xx Count | k6 metrics across all stages | 0 | PASS |
| Aggregate Checks Pass Rate | k6 checks across all stages | 100.0% (1,666 / 1,666 passed) | PASS |
| Railway Resource Utilization | `railway metrics --json` | Observed memory ~2.5% of 8192 MB limit (peak 204.39 MB); peak CPU 0.0396 / 8.0 vCPU limit | PASS |
| Supabase Connection Stability | `supabase inspect db role-stats` | 13 active connections constant across all stages (limit: 60/role) | PASS |
| Post-Scale Data Integrity | Supabase staging service_role audit | Stores: 1, Categories: 1, Products: 3, Orders: 0, Customers: 0 (Delta 0) | PASS |
| Production Railway Isolation | `railway status -p heroic-solace` | Service `stable-ecomerce` Online; zero changes | PASS |
| Production Service Uptime | `GET https://selfcaresinners.com/api/health` | HTTP 200 OK, continuous uptime (3,696+ s) | PASS |
| Production DB Isolation | Ref audit against `dporfgsbwsyqzmlnqrug` | No production target configured; 0 mutations or side effects observed | PASS |
| Production Stripe/Resend | Isolation audit | Zero live Stripe events, zero Resend emails | PASS |

## 2. Key Assessment Findings

- Capacity scale characterization successfully executed on isolated staging environment `https://web-staging-production-8fb1.up.railway.app`.
- 100% of 833 SAFE_READ requests across 2, 5, and 10 VUs returned HTTP 200 OK with zero errors or redirects to mutation flows.
- Throughput scaled near-linearly from 0.68 RPS (1 VU) to 7.78 RPS (10 VUs) with no throughput degradation.
- Observed tail latency decreased at the higher tested concurrency levels (p95 was 752ms at 1-VU and 423ms at 10-VU). Possible contributing factors include connection reuse, cache/warm-up effects, database execution state, and ordinary network/runtime variance. The test did not isolate causality.
- Data integrity verified: exactly 0 orders, 0 order_items, 0 customers, 0 database mutations created.
- Production environment remained completely isolated and undisturbed.
- Formal state governance:
  - `PL20-03J PASS / CLOSED`
  - `CAPACITY_SCALE_MEASURED = true`
  - `CAPACITY_BASELINE_MEASURED = true`
  - `COST_MEASURED = false`
  - `finalScaleReady = false`
- Phase state: PL20-03 ACTIVE; PL21 NOT STARTED.
