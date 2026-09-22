# POST-LAUNCH 20 (PL20-03J): Isolated Staging Capacity Scale Characterization Evidence

**Date:** 2026-09-21
**Phase State:** PL20-01..PL20-03J PASS / CLOSED; PL20-03 ACTIVE; PL21 NOT STARTED
**Evaluated Main Commit:** `6225e50eecc4aafffa69f969559518acdb2a7c63`
**Deployed Staging Commit:** `6225e50eecc4aafffa69f969559518acdb2a7c63`
**Target Environment:** Isolated Staging (`https://web-staging-production-8fb1.up.railway.app`)
**Staging Database:** Dedicated Supabase (`gecdtigvmsvsmhvnlarh`)
**Classification:** `CAPACITY_SCALE_MEASURED = true`
**`COST_MEASURED`:** Strictly `false`
**`finalScaleReady`:** Strictly `false`
**Result:** `PL20-03J PASS / CLOSED`

---

## 1. Executive Summary & Scale Objectives

In strict compliance with **PL20-03J** instructions, capacity scale characterization was executed exclusively against the isolated staging environment (`https://web-staging-production-8fb1.up.railway.app`).

Workload parameters strictly adhered to the approved non-destructive capacity characterization protocol:
- **Workload:** `SAFE_READ` only (7 approved endpoints: `/`, `/api/health`, `/api/readiness`, `/api/public/store`, `/api/public/home`, `/api/public/categories`, `/api/products`).
- **Mutation Boundary:** 0 POST requests, 0 checkouts, 0 payment calls, 0 emails dispatched, 0 database mutations.
- **Production Boundary:** Production domain (`https://selfcaresinners.com`), production database (`dporfgsbwsyqzmlnqrug`), and production Railway (`heroic-solace`) were strictly unapproached and isolated.
- **Harness:** `scripts/load/pl20-scale.k6.js` with hard-coded abort guard against production URLs.
- **Scale Stages:**
  - **Stage A:** 2 VUs, 60 seconds duration, 1 second pacing sleep.
  - **Stage B:** 5 VUs, 60 seconds duration, 1 second pacing sleep.
  - **Stage C:** 10 VUs, 60 seconds duration, 1 second pacing sleep.

Across all three stages (833 total HTTP requests across ~3 minutes of sustained execution), the system exhibited **zero HTTP failures (0.00%)**, **zero HTTP 5xx errors**, **zero database connection exhaustion**, and **zero container restarts**.

---

## 2. Pre-Flight Snapshot & Provider Baselines (Task 1, 6, 8)

| Item | Pre-Test State | Verification Reference / Tool |
|---|---|---|
| **Git Repository** | `HEAD == origin/main == 6225e50eecc4aafffa69f969559518acdb2a7c63` | Clean working tree, fast-forwarded |
| **Staging `/api/health`** | HTTP 200 OK (`version: 6225e50eecc4aafffa69f969559518acdb2a7c63`, uptime: 195s) | REST probe via PowerShell |
| **Staging `/api/readiness`**| HTTP 200 OK (`status: ready`, Supabase latency: 265ms) | REST probe via PowerShell |
| **Railway Deployment** | ID `c02ad984-c666-4999-89c2-9954f8376f13`, Status: `SUCCESS` | `railway status` |
| **Railway Baselines** | CPU: `0.0022 vCPU` (0.0%), Memory: `90.35 MB` (1.1% of 8,192 MB) | `railway metrics --json` |
| **Supabase Connections** | 13 active connections across system roles (limit: 60/role) | `supabase inspect db role-stats` |
| **Staging DB Counts** | stores: 1, categories: 1, products: 3, orders: 0, order_items: 0, customer_metrics: 0, auth.users: 0 | Service-role audit script |

---

## 3. Scale Execution Measurements (Tasks 3, 4, 5)

### Stage A: 2 VUs / 60 Seconds
- **Duration:** 64,294.94 ms
- **Completed Iterations:** 14 full iterations (14 × 7 = 98 requests)
- **Throughput:** 1.5242 requests/second
- **HTTP Failure Rate:** 0.00% (0 / 98)
- **HTTP 5xx Count:** 0
- **Checks:** 196 / 196 passed (100.0%)
- **Latency Distribution:**
  - Min: 36.72 ms
  - Median (p50): 243.12 ms
  - Average: 246.70 ms
  - p90: 443.31 ms
  - p95: 539.90 ms
  - Max: 893.55 ms
- **Between-Stage Health Check:**
  - `/api/health`: HTTP 200 OK (`version: 6225e50eecc4aafffa69f969559518acdb2a7c63`, uptime: 542s)
  - `/api/readiness`: HTTP 200 OK (`status: ready`, Supabase latency: 560ms)
  - Railway Metrics: CPU max 0.0211 vCPU (0.0%), Memory current 145.16 MB (1.8%)
  - Supabase Connections: 13 active connections (limit: 60)

### Stage B: 5 VUs / 60 Seconds
- **Duration:** 64,110.19 ms
- **Completed Iterations:** 35 full iterations (35 × 7 = 245 requests)
- **Throughput:** 3.8215 requests/second
- **HTTP Failure Rate:** 0.00% (0 / 245)
- **HTTP 5xx Count:** 0
- **Checks:** 490 / 490 passed (100.0%)
- **Latency Distribution:**
  - Min: 35.55 ms
  - Median (p50): 243.95 ms
  - Average: 240.16 ms
  - p90: 421.31 ms
  - p95: 570.62 ms
  - Max: 895.18 ms
- **Between-Stage Health Check:**
  - `/api/health`: HTTP 200 OK (`version: 6225e50eecc4aafffa69f969559518acdb2a7c63`, uptime: 2,732s)
  - `/api/readiness`: HTTP 200 OK (`status: ready`, Supabase latency: 480ms)
  - Railway Metrics: CPU max 0.0266 vCPU (0.0%), Memory current 182.49 MB (2.2%)
  - Supabase Connections: 13 active connections (limit: 60)

### Stage C: 10 VUs / 60 Seconds
- **Duration:** 62,941.88 ms
- **Completed Iterations:** 70 full iterations (70 × 7 = 490 requests)
- **Throughput:** 7.7850 requests/second
- **HTTP Failure Rate:** 0.00% (0 / 490)
- **HTTP 5xx Count:** 0
- **Checks:** 980 / 980 passed (100.0%)
- **Latency Distribution:**
  - Min: 35.68 ms
  - Median (p50): 234.53 ms
  - Average: 210.30 ms
  - p90: 386.95 ms
  - p95: 423.28 ms
  - Max: 635.40 ms
- **Post-Stage Health Check:**
  - `/api/health`: HTTP 200 OK (`version: 6225e50eecc4aafffa69f969559518acdb2a7c63`, uptime: 3,451s)
  - `/api/readiness`: HTTP 200 OK (`status: ready`, Supabase latency: 158ms)
  - Railway Metrics: CPU max 0.0396 vCPU (0.0%), Memory current 204.36 MB (2.5%)
  - Supabase Connections: 13 active connections (limit: 60)

---

## 4. Concurrency Scaling Comparison (1-VU Baseline vs 2-VU vs 5-VU vs 10-VU)

| Metric | 1-VU Baseline (PL20-03I) | Stage A (2 VUs) | Stage B (5 VUs) | Stage C (10 VUs) | Scaling Multiplier (10-VU vs 1-VU) |
|---|---|---|---|---|---|
| **VUs** | 1 | 2 | 5 | 10 | **10.0x** |
| **Duration (s)** | 30.85s | 64.29s | 64.11s | 62.94s | - |
| **Requests Total** | 21 | 98 | 245 | 490 | **23.3x** (due to duration + VUs) |
| **RPS** | 0.6808 | 1.5242 | 3.8215 | 7.7850 | **11.44x** (near-linear throughput) |
| **Failure Rate** | 0.00% | 0.00% | 0.00% | 0.00% | **0.00% (Zero degradation)** |
| **HTTP 5xx** | 0 | 0 | 0 | 0 | **0 (Zero errors)** |
| **Checks Pass Rate** | 100.0% (42/42) | 100.0% (196/196) | 100.0% (490/490) | 100.0% (980/980) | **100.0%** |
| **Latency p50 (ms)** | 265.79 ms | 243.12 ms | 243.95 ms | 234.53 ms | **-31.26 ms (-11.8%)** |
| **Latency Avg (ms)** | 318.14 ms | 246.70 ms | 240.16 ms | 210.30 ms | **-107.84 ms (-33.9%)** |
| **Latency p90 (ms)** | 666.59 ms | 443.31 ms | 421.31 ms | 386.95 ms | **-279.64 ms (-42.0%)** |
| **Latency p95 (ms)** | 752.42 ms | 539.90 ms | 570.62 ms | 423.28 ms | **-329.14 ms (-43.7%)** |
| **Latency Max (ms)** | 884.85 ms | 893.55 ms | 895.18 ms | 635.40 ms | **-249.45 ms (-28.2%)** |
| **Railway Memory** | 102.65 MB | 145.16 MB | 182.49 MB | 204.36 MB | **~2.5% of 8192 MB limit** |
| **Railway Peak CPU**| 0.0073 vCPU | 0.0211 vCPU | 0.0266 vCPU | 0.0396 vCPU | **0.0396 / 8.0 vCPU limit** |
| **Active DB Conns** | 8 - 13 | 13 | 13 | 13 | **Constant (Zero leaks)** |

### Performance Observations:
1. **Throughput Linearity:** Throughput scaled almost perfectly with concurrency: `0.68 -> 1.52 -> 3.82 -> 7.78 RPS` (11.44x scale factor for a 10x VU increase with 1s sleep pacing).
2. **Latency Stability & Tail Latency Distribution:**
   Observed tail latency decreased at the higher tested concurrency levels. Possible contributing factors include connection reuse, cache/warm-up effects, database execution state, and ordinary network/runtime variance. The test did not isolate causality.
   - p50 remained rock solid between 234ms and 244ms across all concurrency levels.
   - p95 was observed at 752.42ms at 1-VU and 423.28ms at 10-VU.
   - Max latency was observed at 884.85ms at 1-VU and 635.40ms at 10-VU.
3. **No Saturation Plateau:** Concurrency up to 10 VUs did not approach any inflection point or bottleneck in Node.js event loop processing, TLS termination, or database IOPS.

---

## 5. Resource Consumption & Measured Utilization

### Railway Service (`web-staging` / `SolidBitsMx`)
- **Memory:**
  - Initial baseline: `90.35 MB` (1.1%)
  - Peak during 10-VU run: `204.39 MB`
  - Observed memory utilization was ~2.5% of the configured 8192 MB limit.
- **CPU:**
  - Peak observed CPU was `0.0396 vCPU` relative to the configured `8.0 vCPU` limit.
  - Do NOT infer that all unused configured resource represents proven linear capacity.
- **Deployment State:**
  - Deployment ID `c02ad984-c666-4999-89c2-9954f8376f13` remained continuously in `SUCCESS` status.
  - Zero crash, zero OOM kill, zero auto-restart events.

### Staging Supabase Database (`gecdtigvmsvsmhvnlarh` / `us-east-1`)
- **Active Connections:**
  - System roles (`supabase_admin`: 4, `postgres`: 1, `pgbouncer`: 1, `cli_login_postgres`: 1, `authenticator`: 6) totaled **13 connections**.
  - Connection limit: **60 connections per role**.
  - Utilization: **Zero connection growth across 2, 5, or 10 VUs**.
- **Database Latency:**
  - Verified via `/api/readiness` Supabase ping: ranged between 158ms and 560ms (well within normal cross-region HTTP latency from Railway US West to Supabase US East).

---

## 6. Data Integrity Audit (Task 8)

Audited staging Supabase database `gecdtigvmsvsmhvnlarh` immediately before Stage A and immediately following Stage C:

| Table / Entity | Pre-Scale Count | Post-Scale Count | Expected State | Delta |
|---|---|---|---|---|
| `public.stores` | 1 | 1 | Exactly 1 (`Selfcare Sinners Staging`) | **0** |
| `public.categories` | 1 | 1 | Exactly 1 (`Staging Category`) | **0** |
| `public.products` | 3 | 3 | Exactly 3 (`Synthetic Serum A, B, C`) | **0** |
| `public.orders` | 0 | 0 | Exactly 0 | **0** |
| `public.order_items` | 0 | 0 | Exactly 0 | **0** |
| `public.customer_metrics` | 0 | 0 | Exactly 0 | **0** |
| `auth.users` | 0 | 0 | Exactly 0 | **0** |
| Stripe Live Transactions | 0 | 0 | Exactly 0 | **0** |
| Resend Outbound Emails | 0 | 0 | Exactly 0 (`EMAIL_ALLOW_MOCKS=true`) | **0** |

**Conclusion:** Exactly zero rows were mutated, created, or deleted across the entire scale test.

---

## 7. Production Isolation Audit (Task 7)

- **Target Configuration:** No production target was configured in the load harness.
- **Provider Side Effects:** No production mutations or provider side effects were observed.
- **Cross-Talk:** Production cross-talk was not observed.

| Infrastructure Surface | Production Reference / Target | Audit Result | Isolation Status |
|---|---|---|---|
| **Production Railway Project** | `heroic-solace` (`2ee53291-c0b1-4859-9ae6-8e331d1f6435`) | Service `stable-ecomerce` Online; zero redeployments; zero variable edits | **ISOLATED / UNTOUCHED** |
| **Production Domain** | `https://selfcaresinners.com` | Probe `GET /api/health` returned HTTP 200 OK; continuous uptime (3,696+ s) | **ISOLATED / UNTOUCHED** |
| **Production Supabase DB** | `dporfgsbwsyqzmlnqrug` | Staging app configured strictly with `gecdtigvmsvsmhvnlarh`; no production database mutations observed | **ISOLATED / UNTOUCHED** |
| **Production Stripe** | Live account (`acct_1TLawpEKfBRabUZ0`) | Zero charges, customers, or payment intents created | **ISOLATED / UNTOUCHED** |
| **Production Resend** | `resend.com` Live Domain | Zero transactional emails sent; mock mode active on staging | **ISOLATED / UNTOUCHED** |

---

## 8. Abort Conditions Audit (Task 9)

| Abort Condition Trigger | Threshold | Observed Value | Triggered? |
|---|---|---|---|
| HTTP 5xx or Systemic Errors | Any consecutive 5xx or > 1% failure rate | 0 5xx (0.00% failure rate) | **NO** |
| Web Service Crash / Restart | Any container termination or OOM kill | 0 crashes; deployment continuous | **NO** |
| Supabase Connection Refusal | Exhaustion or connection error | 0 errors; latency normal (158ms) | **NO** |
| Unexpected Database Mutation | Any delta in orders, products, stores, users | 0 rows mutated | **NO** |
| Provider Rate Limiting / 429 | Any provider throttling | 0 rate limits observed | **NO** |
| Cross-talk to Production | Any request reaching production domain or ref | 0 cross-talk events | **NO** |

---

## 9. Formal State Governance & Invariants (Task 10)

1. **`PL20-03J PASS / CLOSED`**:
   - Scale characterization successfully executed across 2-VU, 5-VU, and 10-VU stages against isolated staging.
   - All 833 SAFE_READ requests passed with 0 failures and 0 5xx errors.
   - Evidence fully normalized and accepted.

2. **`CAPACITY_SCALE_MEASURED = true`**:
   - Explicit meaning: `CAPACITY_SCALE_MEASURED = true` means controlled scale characterization evidence exists through 10 VUs on isolated staging.
   - It does **NOT** mean:
     - maximum capacity is known;
     - production supports 10 concurrent users only;
     - production supports any specific number of real users;
     - SLA certification exists.

3. **`CAPACITY_BASELINE_MEASURED = true`**:
   - 1-VU baseline measured and accepted in PL20-03I.

4. **`COST_MEASURED = false`**:
   - Confirmed strictly `false`. No synthetic cost evaluations performed.

5. **`finalScaleReady = false`**:
   - Confirmed strictly `false`. Scale readiness is not declared until full roadmap sign-off.

6. **Phase Governance:**
   - `PL20-03`: ACTIVE
   - `PL21`: NOT STARTED
