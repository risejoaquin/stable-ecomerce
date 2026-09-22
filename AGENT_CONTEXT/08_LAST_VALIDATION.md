# LAST VALIDATION

**Timestamp:** 2026-09-21T15:35:00-07:00
**Phase:** POST-LAUNCH 20 (PL20-03I Remote Capacity Baseline - Isolated Staging Only)
**Branch:** `main`
**Base Commit:** `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
**Deployed Staging Commit:** `04effaf0ddf7ce72e7b374718428f1849c4e32c0`

## 1. Validation & Test Suite Status

| Gate / Assessment | Command / Source | Result | Status |
|---|---|---|---|
| Target Safety Lock | `scripts/load/pl20-baseline.k6.js:98` | Abort lock intact, `ALLOW_PRODUCTION_LOAD_TEST=false` | PASS |
| Target Hostname Verification | Parameter audit | `https://web-staging-production-8fb1.up.railway.app` strictly targeted | PASS |
| Pre-Run Health Probe | `GET /api/health` | HTTP 200 OK, version `04effaf0ddf7ce72e7b374718428f1849c4e32c0` | PASS |
| Pre-Run Readiness Probe | `GET /api/readiness` | HTTP 200 OK, Supabase `ok: true` (247ms) | PASS |
| Baseline k6 Execution | `k6 run scripts/load/pl20-baseline.k6.js` | 1 VU, 30s, 1s sleep, exit code 0 | PASS |
| HTTP Failure Rate | k6 summary (`http_req_failed`) | 0.00% (0 / 21 requests failed) | PASS |
| HTTP 5xx Count | k6 summary (`http_5xx_count`) | 0 | PASS |
| Checks Pass Rate | k6 summary (`checks`) | 100.0% (42 / 42 passed) | PASS |
| Baseline Latencies | k6 summary (`http_req_duration`) | p50: 265.79ms, p95: 752.42ms, max: 884.85ms | MEASURED |
| Throughput | k6 summary (`http_reqs`) | 21 total requests, 0.6808 req/s | MEASURED |
| Stop Conditions Audit | Runtime & provider monitoring | 0 5xx, 0 Railway restarts (Deployment ID c8f1bb38 maintained), 0 pool exhaustion, 0 cross-talk | PASS |
| Post-Run Data Integrity | Supabase staging service_role audit | Stores: 1, Categories: 1, Products: 3, Orders: 0, Customers: 0 | PASS |
| Production Railway Isolation | `railway status -p heroic-solace` | Service `stable-ecomerce` Online; zero changes | PASS |
| Production Service Uptime | `GET https://selfcaresinners.com/api/health` | HTTP 200 OK, continuous uptime (82,733+ s) | PASS |
| Production DB Isolation | Ref audit against `dporfgsbwsyqzmlnqrug` | Zero network requests directed to production database | PASS |
| Production Stripe/Resend | Isolation audit | Zero live Stripe events, zero Resend emails | PASS |

## 2. Key Assessment Findings

- Remote capacity baseline successfully executed on isolated staging environment `https://web-staging-production-8fb1.up.railway.app`.
- 100% of 21 SAFE_READ requests returned HTTP 200 OK with zero errors or redirects to mutation flows.
- Data integrity verified: 0 orders, 0 order_items, 0 customers, 0 database mutations created.
- Production environment was completely isolated and undisturbed (82,733s continuous uptime).
- Formal state:
  - `PL20-03I PASS / CLOSED`
  - `CAPACITY_BASELINE_MEASURED = true`
  - `CAPACITY_SCALE_MEASURED = false`
  - `COST_MEASURED = false`
  - `finalScaleReady = false`
- Phase state: PL20-03 ACTIVE; PL21 NOT STARTED.
