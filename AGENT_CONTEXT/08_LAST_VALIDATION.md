# LAST VALIDATION

**Timestamp:** 2026-09-19T14:06:00-07:00
**Phase:** POST-LAUNCH 20 (PL20-03C Local Capacity Baseline)
**Branch:** `main`
**Base Commit:** `c3ab494930b0f595a50ea35300c051ac148f997c`

## 1. Validation Suite Status

| Gate | Command | Result | Pass/Fail |
|---|---|---|---|
| Commit Binding | `git rev-parse HEAD; git rev-parse origin/main` | `c3ab494930b0f595a50ea35300c051ac148f997c` | PASS |
| Remote CI Status | GitHub Actions run query | Quality Gate (run `35468354537`) and Smoke (`35468418696`) PASS | PASS |
| Local Isolation Preflight | Loopback check & environment secret scan | Ambient variable stripped; `/api/readiness` confirms 100% isolated | PASS |
| k6 Runner Installation | `winget install --id Grafana.k6 --exact` | `k6 v2.2.0 (commit/00a9a1b7f5, go1.26.5, windows/amd64)` installed | PASS |
| Local Build | `npm run build` | Clean Vite + esbuild bundle | PASS |
| SAFE_READ Route Verification | Manual inspection of 7 endpoints via `curl.exe` | 7/7 returned expected responses, zero redirects | PASS |
| Local k6 Baseline Execution | `k6 run .\scripts\load\pl20-baseline.k6.js` | 35 requests, 0.997 req/s, 0.81ms p50, 5.73ms p95, 0 crashes | PASS |
| Side Effect & Log Audit | Server log inspection (`pino` JSON) | 0 mutations, 0 provider calls, 0 DB queries, 0 crashes | PASS |

## 2. Key Verified Behaviors

- Target host `BASE_URL` is strictly `http://127.0.0.1:3000`.
- All 7 approved `SAFE_READ` endpoints verified functional in isolated local environment:
  - `/` (200 OK)
  - `/api/health` (200 OK)
  - `/api/readiness` (503 Service Unavailable - expected in isolated development mode when external providers are unconfigured)
  - `/api/public/store` (200 OK)
  - `/api/public/home` (200 OK)
  - `/api/public/categories` (200 OK)
  - `/api/products` (200 OK)
- Zero redirects toward `/checkout`, `/orders`, `/admin`, `/payment`, `/refund`, or `/webhook`.
- `k6` executed locally with 1 VU for 30s with 1s sleep without mutations or external leaks.
- `capacity.local_baseline = MEASURED`.
- `finalScaleReady` strictly remains `false`.
- PL20-03 remains ACTIVE; PL21 NOT STARTED.
