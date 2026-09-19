# POST-LAUNCH 20 (PL20-03C): Local Capacity Baseline Execution & Status Report

**Date:** 2026-09-19
**Phase:** POST-LAUNCH 20 (PL20-01 PASS / CLOSED; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03B PASS / CLOSED; PL20-03 ACTIVE; PL20-03C LOCAL BASELINE MEASURED; PL21 NOT STARTED)
**Evaluated Commit SHA:** `c3ab494930b0f595a50ea35300c051ac148f997c`
**Status:** READY_FOR_CHATGPT_WEB_VALIDATION
**`finalScaleReady`:** Strictly `false`

---

## 1. Task 1: Commit Binding Verification

```powershell
git rev-parse HEAD
git rev-parse origin/main
```
- **HEAD:** `c3ab494930b0f595a50ea35300c051ac148f997c`
- **origin/main:** `c3ab494930b0f595a50ea35300c051ac148f997c`
- **Status:** PASS (Exact match, origin/main has not advanced).

---

## 2. Task 2: Remote CI Status

Inspected GitHub Actions runs for commit `c3ab494930b0f595a50ea35300c051ac148f997c`:

| Workflow | Run ID | Trigger | Duration | Result | Note |
|---|---|---|---|---|---|
| Selfcare Quality Gate | 35468354537 | push | 1m56s | `completed success` | Lint, unit tests, build, secret scan, core regression, security baseline, e2e, aggregate all PASS |
| Selfcare Production Smoke | 35468357893 | deployment_status | 25s | `completed failure` | Known deployment-status race (smoke fired before Railway container finished cold boot) |
| Selfcare Production Smoke | 35468418696 | deployment_status | 30s | `completed success` | Subsequent same-SHA exact-commit run succeeded completely |

- **Status:** PASS. Both Quality Gate and same-SHA Production Smoke completed successfully.

---

## 3. Task 3: Local k6 Installation

- **Package Manager:** `winget install --id Grafana.k6 --exact`
- **Installed Binary Path:** `C:\Program Files\k6\k6.exe`
- **Version Command:**
  ```powershell
  & "C:\Program Files\k6\k6.exe" version
  ```
- **Exact Installed Version:** `k6 v2.2.0 (commit/00a9a1b7f5, go1.26.5, windows/amd64)`
- **Scope Discipline:** No unrelated tooling, extensions, or packages were installed.

---

## 4. Task 4: Local Isolation Preflight

### 4.1 Target Host Policy
- Target URL: `http://127.0.0.1:3000` (Loopback only).
- Disallowed hosts (`selfcaresinners.com`, `railway.app`, external hosts): Strictly rejected.

### 4.2 Environment Secret Scan
Inspected environment variables for live credentials:
- **Preflight Scan:** Ambient variable `SOLIDPOS_SUPABASE_DATABASE_URL` (belonging to another workspace) was detected and stripped from the execution session.
- **Provider Audit:** Re-checked `SUPABASE`, `DATABASE`, `POSTGRES`, `SERVICE_ROLE`, `STRIPE`, `RESEND`, `RAILWAY`, `VITE_SUPABASE`. No secrets printed. No live/production indicators active.
- **Verification via `/api/readiness`:**
  ```json
  {
    "status": "degraded",
    "checks": {
      "env": { "ok": false, "missing": [] },
      "supabase": { "ok": false, "error": "Supabase client is not configured" },
      "stripe": { "ok": false },
      "email": { "ok": false }
    }
  }
  ```
- **Status:** PASS (100% local isolation confirmed).

---

## 5. Tasks 5 & 6: Local App Preparation & SAFE_READ Verification

Built project locally with `npm run build` and launched `node dist/server.cjs` on port 3000.
Manually inspected all 7 approved `SAFE_READ` endpoints using `curl.exe`:

| Route | Method | HTTP Status | Redirect URL | Response Inspection |
|---|---|---|---|---|
| `/` | `GET` | `200` | (none) | HTML served by Vite/Express |
| `/api/health` | `GET` | `200` | (none) | `{"status":"ok","service":"selfcare-sinners-web","environment":"development","version":"local"}` |
| `/api/readiness` | `GET` | `503` | (none) | `{"status":"degraded", checks: { supabase: not configured, stripe: false, email: false }}` (503 expected in isolated local mode) |
| `/api/public/store` | `GET` | `200` | (none) | `{"store":{"name":"Terra & Tide"},"products":[]}` |
| `/api/public/home` | `GET` | `200` | (none) | `{"banners":[],"categories":[],"featuredProducts":[],"campaigns":[]}` |
| `/api/public/categories` | `GET` | `200` | (none) | `{"data":[]}` |
| `/api/products` | `GET` | `200` | (none) | `{"data":[],"total":0,"page":1,"pageSize":20}` |

- **Redirect Check:** Zero redirects toward `/checkout`, `/orders`, `/admin`, `/payment`, `/refund`, or `/webhook`.
- **Side Effect Check:** Zero mutations, zero emails, zero database write operations.

---

## 6. Tasks 7 & 8: Local k6 Baseline Execution & Exact Metrics

### 6.1 Execution Parameters
- `BASE_URL`: `http://127.0.0.1:3000`
- `PL20_ENVIRONMENT`: `local`
- `PL20_STAGE`: `LOCAL_BASELINE_01`
- `APPROVED_VUS`: `1`
- `APPROVED_DURATION`: `30s`
- `APPROVED_SLEEP_SECONDS`: `1`
- `ALLOW_PRODUCTION_LOAD_TEST`: Strictly unset (not present)
- `k6` summary output path: `AGENT_CONTEXT/evidence/post-launch-20/pl20-03c-local-baseline-summary.json`

### 6.2 k6 Harness Mechanical Compatibility Note
k6's Goja runtime does not implement the WHATWG `URL` class global (`ReferenceError: URL is not defined`). In accordance with `AGENTS.md` mechanical fix guidelines, `normalizeBaseUrl` in `scripts/load/pl20-baseline.k6.js` was adjusted to use a regex URL parser while preserving every security constraint (loopback/host root only, forbidden route checks, and locked production guard).

### 6.3 Exact Metrics Captured

| Metric | Value | Description / Note |
|---|---|---|
| `k6_version` | `k6 v2.2.0` | Grafana k6 Windows amd64 |
| `evaluated_commit_sha` | `c3ab494930b0f595a50ea35300c051ac148f997c` | Exact bound commit |
| `requests_total` | `35` | 5 complete iterations x 7 endpoints |
| `requests_per_second` | `0.9969799597001331` | ~1.00 req/s with 1s inter-request sleep |
| `error_rate` | `0.14285714285714285` | 5 / 35 requests (503 on `/api/readiness` due to unconfigured providers) |
| `p50_latency_ms` | `0.8072 ms` | Median duration |
| `p95_latency_ms` | `5.7263 ms` | 95th percentile duration |
| `p99_latency_ms` | `null` | Capped sample size (< 100 requests) |
| `max_latency_ms` | `40.4526 ms` | Maximum request duration |
| `http_5xx_count` | `5` | Exactly the 5 calls to `/api/readiness` returning HTTP 503 |
| `checks_passed` | `65 / 70` (92.86%) | 35/35 no redirect to mutation flow; 30/35 status is 2xx/3xx |
| `performance_score` | `null` | Strictly omitted |
| `arbitrary_slo` | `null` | Strictly omitted |

### 6.4 Route Breakdown
- `/`: 5 requests, 5 x 200 OK
- `/api/health`: 5 requests, 5 x 200 OK
- `/api/readiness`: 5 requests, 5 x 503 Service Unavailable (intentional degraded status due to unconfigured external cloud providers in local isolation)
- `/api/public/store`: 5 requests, 5 x 200 OK
- `/api/public/home`: 5 requests, 5 x 200 OK
- `/api/public/categories`: 5 requests, 5 x 200 OK
- `/api/products`: 5 requests, 5 x 200 OK

---

## 7. Task 9: Server Log & Side Effect Review

Inspected local application server logs (`pino` JSON output):
- **5xx count:** 5 (exclusively from `/api/readiness` 503)
- **Server crashes:** 0
- **Database errors:** 0
- **Provider calls:** 0
- **Stripe calls:** 0
- **Resend calls:** 0
- **Email activity:** 0
- **Order mutation:** 0
- **Inventory mutation:** 0
- **Admin mutation:** 0
- **Webhook activity:** 0
- **Status:** PASS (No unexpected mutations, leaks, or side effects).

---

## 8. Tasks 10: Result Interpretation & Capacity State

- **`capacity.local_baseline`:** `MEASURED`
- **`CAPACITY_BASELINE_MEASURED`:** `false`
- **`CAPACITY_SCALE_MEASURED`:** `false`
- **`isCapacityLoadMeasured`:** `false`
- **`finalScaleReady`:** Strictly `false`

### Explicit Evidence Boundaries
This first local baseline proves:
1. Approved k6 test harness runs to completion against local app.
2. Target route list adheres strictly to the approved `SAFE_READ` set.
3. Metric capture and summary extraction function deterministically.
4. Local isolation prevents any accidental cloud provider calls or mutations.

This local baseline **DOES NOT** prove:
- Production capacity.
- Staging capacity.
- Railway container scale capacity.
- Supabase connection pressure capacity.
- Concurrent User (CCU) certification.
- Scale readiness.

---

## 9. Reproducibility Run (Run 2) & Committed Harness Verification

### 9.1 Provenance & Compatibility Fix
- **Initial Run (Run 1):** Executed on `c3ab494930b0f595a50ea35300c051ac148f997c` with a local compatibility fix in `scripts/load/pl20-baseline.k6.js` (unblocking k6 Goja engine's lack of WHATWG `new URL` support via deterministic regex URL parsing).
- **Harness Commit:** The exact regex parser, hardened with strict query/fragment rejection (`?` / `#`) and non-root path rejection, is committed in `scripts/load/pl20-baseline.k6.js`.
- **Harness Contract Tests:** Added 10 regression tests in `tests/api/functional-quality-contracts.test.ts` verifying loopback acceptance, localhost acceptance, production locking, production override, `/checkout`, `/admin`, `/orders` rejection, non-root path rejection, malformed URL rejection, and query/fragment rejection.
- **Script Path:** `scripts/load/pl20-baseline.k6.js`
- **k6 Version:** `k6 v2.2.0 (commit/00a9a1b7f5, go1.26.5, windows/amd64)`

### 9.2 Reproducibility Run (Run 2) Execution Parameters
- `BASE_URL`: `http://127.0.0.1:3000`
- `PL20_ENVIRONMENT`: `local`
- `PL20_STAGE`: `LOCAL_BASELINE_01`
- `APPROVED_VUS`: `1`
- `APPROVED_DURATION`: `30s`
- `APPROVED_SLEEP_SECONDS`: `1`
- `ALLOW_PRODUCTION_LOAD_TEST`: Strictly unset

### 9.3 Run 2 Exact Metrics

| Metric | Run 1 Value | Run 2 Value | Description / Note |
|---|---|---|---|
| `k6_version` | `k6 v2.2.0` | `k6 v2.2.0` | Exact matching engine |
| `requests_total` | `35` | `35` | Exactly 5 complete iterations x 7 SAFE_READ endpoints |
| `requests_per_second` | `0.997` | `0.996661267334933` | Deterministic ~1.00 req/s with 1s sleep |
| `error_rate` | `0.142857` | `0.14285714285714285` | 5 / 35 requests (strictly 503 on `/api/readiness`) |
| `p50_latency_ms` | `0.8072 ms` | `0.8467 ms` | Median duration |
| `p95_latency_ms` | `5.7263 ms` | `11.2685 ms` | 95th percentile duration |
| `p99_latency_ms` | `null` | `null` | Sample size < 100 requests |
| `max_latency_ms` | `40.4526 ms` | `37.9741 ms` | Maximum request duration |
| `http_5xx_count` | `5` | `5` | Exactly the 5 calls to `/api/readiness` returning 503 |
| `checks_passed` | `65 / 70` | `65 / 70` | 35/35 no redirect (100%); 30/35 status is 2xx/3xx |

### 9.4 Run 2 Server Log & Side Effect Review
- **5xx count:** 5 (exclusively `/api/readiness` 503)
- **Server crashes:** 0
- **Database errors:** 0
- **Provider calls:** 0
- **Stripe calls:** 0
- **Resend calls:** 0
- **Email activity:** 0
- **Order mutations:** 0
- **Inventory mutations:** 0
- **Admin mutations:** 0
- **Webhook activity:** 0
- **Reproducibility Verdict:** PASS (Deterministic execution verified).
