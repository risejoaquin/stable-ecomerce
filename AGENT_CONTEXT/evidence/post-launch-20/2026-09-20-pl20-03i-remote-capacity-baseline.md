# POST-LAUNCH 20 (PL20-03I): Remote Capacity Baseline Evidence - Isolated Staging Only

**Date:** 2026-09-20 (Executed 2026-09-21)
**Phase State:** PL20-01..PL20-03I PASS / CLOSED; PL20-03 ACTIVE; PL21 NOT STARTED
**Evaluated Main Commit:** `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
**Deployed Staging Commit:** `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
**Staging Hostname:** `https://web-staging-production-8fb1.up.railway.app`
**Staging Supabase Ref:** `gecdtigvmsvsmhvnlarh` (us-east-1)
**Production Domain:** `https://selfcaresinners.com` (Untouched, strictly isolated)
**Classification State:** `CAPACITY_BASELINE_MEASURED = true`
**Scale Capacity Measured:** `CAPACITY_SCALE_MEASURED = false` (1-VU baseline only; not scale capacity)
**Cost Measured:** `COST_MEASURED = false` (No load cost test, zero synthetic cost rows persisted)
**Final Scale Ready:** `finalScaleReady = false`

**Result:** `READY_FOR_CHATGPT_WEB_VALIDATION`

---

## 1. Executive Summary

Phase **PL20-03I** executed the approved remote capacity baseline exclusively against the newly provisioned and isolated staging environment (`https://web-staging-production-8fb1.up.railway.app`). The load generation was executed using `scripts/load/pl20-baseline.k6.js` targeting strictly non-mutating SAFE_READ endpoints.

The baseline completed cleanly with **zero HTTP failures (0.00%)**, **zero 5xx errors**, **100% check pass rate**, and **zero production cross-talk**. Pre-run and post-run database audits confirmed that staging data remained perfectly identical (1 store, 1 category, 3 products, 0 orders, 0 customers). Production service `https://selfcaresinners.com` maintained continuous uninterrupted uptime (82,733+ seconds).

---

## 2. Safety Lock & Parameter Verification (Tasks 1, 2, 4)

| Parameter | Specification | Measured / Executed Value | Compliance |
|---|---|---|---|
| **Target Hostname** | `https://web-staging-production-8fb1.up.railway.app` | `https://web-staging-production-8fb1.up.railway.app` | PASS |
| **Production Target Lock** | Abort on `selfcaresinners.com` | `scripts/load/pl20-baseline.k6.js:98` enforced; `ALLOW_PRODUCTION_LOAD_TEST=false` | PASS |
| **Script Integrity** | Do not weaken/bypass lock | Unmodified script used | PASS |
| **Virtual Users (VUs)** | 1 VU | 1 constant VU | PASS |
| **Duration** | 30 seconds | 30s target (30.85s graceful completion) | PASS |
| **Pacing / Sleep** | 1 second between routes | 1.0s sleep per route | PASS |
| **Approved Routes** | 7 SAFE_READ routes only | Verified exactly as listed below | PASS |
| **Mutations / POSTs** | Strictly forbidden | Zero POSTs, zero checkout/payment calls | PASS |

### Approved SAFE_READ Route List
```text
GET /
GET /api/health
GET /api/readiness
GET /api/public/store
GET /api/public/home
GET /api/public/categories
GET /api/products
```

---

## 3. Pre-Run Snapshot (Task 3)

Captured snapshot:

### Staging Probes
- **`GET /api/health`:**
  - Status: `HTTP 200 OK`
  - Version: `04effaf0ddf7ce72e7b374718428f1849c4e32c0` (matches repository HEAD and origin/main)
  - Environment: `production`
  - Timestamp: `2026-09-21T02:59:45.439Z` (Uptime: 991 seconds, captured in pre-execution session prior to inter-session pause before baseline launch)
- **`GET /api/readiness`:**
  - Status: `HTTP 200 OK`
  - Status Field: `"ready"`
  - Checks: `env: {ok: true, missing: []}`, `supabase: {ok: true, latencyMs: 247}`, `stripe: {ok: true}`, `email: {ok: true}`

### Railway Resource Baseline (Service `web-staging`)
- **CPU:** Current: `0.0 vCPU`, Utilization: `0.0%`, Limit: `8.0 vCPU`
- **Memory:** Current: `102.65 MB`, Average: `102.63 MB`, Utilization: `1.3%`, Limit: `8192.0 MB`
- **Deployment ID:** `c8f1bb38-37c3-4c42-a411-1f83a6612ecd` (`SUCCESS`)

### Supabase Staging Active Connection Baseline (`gecdtigvmsvsmhvnlarh`)
Queried via `npx supabase inspect db role-stats`:
- `supabase_admin`: 4 active connections
- `authenticator`: 1 active connection
- `postgres`: 1 active connection
- `pgbouncer`: 1 active connection
- `anon`: 0 active connections
- `authenticated`: 0 active connections
- `service_role`: 0 active connections
- **Total active connections:** 7 / 60 max per role

---

## 4. Remote Baseline Execution & Results (Tasks 3, 4)

Command executed:
```powershell
& 'C:\Program Files\k6\k6.exe' run `
  -e PL20_ENVIRONMENT=staging `
  -e PL20_STAGE=PL20-03I `
  -e APPROVED_VUS=1 `
  -e APPROVED_DURATION=30s `
  -e APPROVED_SLEEP_SECONDS=1 `
  -e BASE_URL=https://web-staging-production-8fb1.up.railway.app `
  -e K6_SUMMARY_PATH=AGENT_CONTEXT/evidence/post-launch-20/pl20-03i-remote-baseline-summary.json `
  scripts/load/pl20-baseline.k6.js
```

### Metrics Summary

| Metric | Measured Value | Unit / Format | Status |
|---|---|---|---|
| **Exit Code** | `0` | Exit code | PASS |
| **Total Requests (`http_reqs`)** | `21` | count (3 complete iterations × 7 routes) | PASS |
| **Throughput Rate** | `0.6808` | requests/sec | PASS |
| **Total Iterations** | `3` | iterations | PASS |
| **Test Duration** | `30.848` | seconds | PASS |
| **HTTP Failure Rate (`http_req_failed`)** | `0.00%` (0 / 21) | rate | PASS |
| **HTTP 5xx Count (`http_5xx_count`)** | `0` | count | PASS |
| **Checks Rate** | `100.0%` (42 / 42) | rate | PASS |
| - `SAFE_READ status is 2xx/3xx` | 21 / 21 passes (100%) | checks | PASS |
| - `no redirect to mutation flow` | 21 / 21 passes (100%) | checks | PASS |
| **Latency Min** | `39.97` | ms | Measured |
| **Latency Med (p50)** | `265.79` | ms | Measured |
| **Latency Avg** | `318.14` | ms | Measured |
| **Latency p90** | `666.59` | ms | Measured |
| **Latency p95** | `752.42` | ms | Measured |
| **Latency p99** | N/A (sample size n=21) | ms | Evaluated |
| **Latency Max** | `884.85` | ms | Measured |
| **Data Sent** | `3.15` KB (`102.21` B/s) | bytes | Measured |
| **Data Received** | `64.59` KB (`2.09` KB/s) | bytes | Measured |

---

## 5. Stop Conditions & Process Continuity Evaluation (Tasks 1, 2, 5)

| Stop Condition Trigger | Observed | Abort Required |
|---|---|---|
| Systemic 5xx or HTTP 500 | None (`http_5xx_count: 0`, `http_req_failed: 0`) | NO |
| Container crash / restart | Evaluated via independent Railway deployment tracking (see below) | NO |
| Database connection refusal | None (Supabase latency 171ms post-run; 0 errors) | NO |
| Database connection pool exhaustion | None (Active connections 8 / 60 max per role) | NO |
| Unexpected data mutation | None (Row counts identical before and after run) | NO |
| Provider side effect / rate limiting | None (Zero 429s, zero provider warnings) | NO |
| Production cross-talk | None (100% isolated to staging host and project ref) | NO |

### Container Continuity & Uptime Evidence Clarification

> **Container restart state could not be proven from sequential uptime values because the captured uptime evidence was temporally inconsistent.**

- **Root Cause Analysis of Uptime Discrepancy & Timing Semantics:**
  - **Pre-run probe session timestamp (`GET /api/health`):** Captured at `2026-09-21T02:59:45.439Z` (`uptimeSeconds: 991`).
  - **Inter-session gap:** Work was suspended at 02:59Z and resumed later in the afternoon session.
  - **k6 execution duration:** Measured authoritatively by k6's internal high-resolution clock as `duration_ms: 30847.6278` (~30.848 seconds). Raw k6 Goja output does not emit wall-clock process start/end ISO timestamps.
  - **Task logging timestamps:** Background task `task-3084` log file was created on disk at `2026-09-21T15:21:20-07:00` (`22:21:20Z`) and finished at `2026-09-21T15:21:42-07:00` (`22:21:42Z`), with system completion notification at `22:21:43Z`. The previously cited `22:17:20Z` was an artifact of an earlier command's local timestamp (`12:17:20-07:00`) and did not represent the start of the 30.848s k6 execution.
  - **Post-run probe session timestamp (`GET /api/health`):** Captured at `2026-09-21T22:22:30.070Z` (`uptimeSeconds: 70,755`).
  - **Elapsed probe interval:** The wall-clock elapsed time between the pre-run probe (02:59:45Z) and the post-run probe (22:22:30Z) was `69,765` seconds (~19.38 hours). Adding the initial uptime (`991s + 69,765s = 70,756s`) matches the post-run reading of `70,755s` (within 1 second), proving the container process lived continuously across the inter-session gap. However, because the pre-run probe was captured ~19.3 hours prior to k6 execution rather than immediately before launch, comparing 991s to 70,755s across a 30.8s test run was temporally inconsistent and could not serve as sequential delta proof.
- **Independent Provider Verification:**
  - Railway Deployment ID `c8f1bb38-37c3-4c42-a411-1f83a6612ecd` remained continuously active in `SUCCESS` status with 0 crash or restart events recorded by Railway.
  - Railway HTTP metrics recorded 23 total requests (21 k6 requests + 2 probes), 23 x 2xx responses, and 0 x 5xx errors.


---

## 6. Post-Run Data Integrity Audit (Task 6)

Queried staging Supabase database `gecdtigvmsvsmhvnlarh` via service role client immediately post-run:

| Table / Entity | Pre-Run Count | Post-Run Count | Expected State | Delta |
|---|---|---|---|---|
| `public.stores` | 1 | 1 | Exactly 1 (`Selfcare Sinners Staging`) | 0 |
| `public.categories` | 1 | 1 | Exactly 1 (`Staging Category`) | 0 |
| `public.products` | 3 | 3 | Exactly 3 (`Synthetic Serum A, B, C`) | 0 |
| `public.orders` | 0 | 0 | Exactly 0 | 0 |
| `public.order_items` | 0 | 0 | Exactly 0 | 0 |
| `public.customer_metrics` | 0 | 0 | Exactly 0 | 0 |
| `auth.users` | 0 | 0 | Exactly 0 | 0 |
| Stripe Live Events | 0 | 0 | Exactly 0 | 0 |
| Outbound Resend Emails | 0 | 0 | Exactly 0 (`EMAIL_ALLOW_MOCKS=true`) | 0 |

---

## 7. Production Isolation Audit (Task 7)

| Infrastructure Surface | Production Reference / Target | Audit Result | Isolation Status |
|---|---|---|---|
| **Production Railway Project** | `heroic-solace` (`2ee53291-c0b1-4859-9ae6-8e331d1f6435`) | Service `stable-ecomerce` Online; zero redeployments; zero variable edits | ISOLATED / UNTOUCHED |
| **Production Domain** | `https://selfcaresinners.com` | Probe `GET /api/health` returned HTTP 200 OK; uptime continuous (82,733+ s) | ISOLATED / UNTOUCHED |
| **Production Supabase DB** | `dporfgsbwsyqzmlnqrug` | Zero network calls directed to this reference; zero mutations | ISOLATED / UNTOUCHED |
| **Production Stripe** | Live account (`acct_1TLawpEKfBRabUZ0`) | Zero charges, customers, or payment intents created | ISOLATED / UNTOUCHED |
| **Production Resend** | `resend.com` Live Domain | Zero transactional emails sent; mock mode active on staging | ISOLATED / UNTOUCHED |

---

## 8. Provider Post-Run Health & Metrics Snapshot

### Staging Probes Post-k6
- **`GET /api/health`:**
  - Status: `HTTP 200 OK`
  - Version: `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
  - Environment: `production`
  - Timestamp: `2026-09-21T22:22:30.070Z`
  - Uptime: `70,755` seconds (reflects continuous process life across the session)
- **`GET /api/readiness`:**
  - Status: `HTTP 200 OK`
  - Supabase Check: `ok: true`, latency: `171ms` (normal database response time)

### Railway Service Metrics (`web-staging`)
- **HTTP Traffic:** Total: 23 requests (21 k6 requests + 2 verification probes), 2xx: 23, 5xx: 0, Error Rate: 0.0%, p50: 211ms
- **CPU:** Current: `0.000021 vCPU` (utilization 0.0%), Max peak during run: `0.0073 vCPU` (utilization < 0.1%)
- **Memory:** Current: `114.99 MB` (utilization 1.4% of 8,192 MB limit)
- **Deployment Status:** `SUCCESS` (`c8f1bb38-37c3-4c42-a411-1f83a6612ecd`)

### Supabase Connection State (`gecdtigvmsvsmhvnlarh`)
- `authenticator`: 2 active connections (pool limit: 60)
- `postgres`: 1 active connection (pool limit: 60)
- `pgbouncer`: 1 active connection (pool limit: 60)
- `supabase_admin`: 4 active connections (pool limit: 60)
- `cli_login_postgres`: 1 active connection (pool limit: 60)
- **Total active connections:** 8 (13.3% of 60-connection pool limit for single role)

---

## 9. Formal Classification & State Governance (Task 6)

In strict accordance with Task 6 classification rules:

1. **`PL20-03I PASS / CLOSED`**:
   - The remote baseline run completed with exit code 0.
   - The target was strictly isolated staging (`https://web-staging-production-8fb1.up.railway.app`).
   - Metrics were measured and persisted to `pl20-03i-remote-baseline-summary.json`.
   - Zero HTTP failures occurred (0.00%).
   - Data integrity remained unchanged (1 store, 1 category, 3 products, 0 orders, 0 customers).
   - Zero demonstrated production cross-talk occurred.

2. **`CAPACITY_BASELINE_MEASURED = true`**:
   - Remote 1-VU capacity baseline successfully measured on isolated staging.

3. **`CAPACITY_SCALE_MEASURED = false`**:
   - A single 1-VU baseline establishes remote baseline latency and operational health, but does **not** evaluate multi-VU concurrency, saturation thresholds, or scale limits.

4. **`COST_MEASURED = false`**:
   - Baseline execution did not perform cost billing evaluations or persist real synthetic cost logs.

5. **`finalScaleReady = false`**:
   - Scale readiness is strictly not marked true.

6. **Phase State**:
   - `PL20-03`: ACTIVE
   - `PL21`: NOT STARTED
