# LAST VALIDATION

**Timestamp:** 2026-09-19T14:26:00-07:00
**Phase:** POST-LAUNCH 20 (PL20-03C Local Capacity Baseline Reproducibility Hotfix)
**Branch:** `main`
**Base Commit:** `74c693fa285d01c37781b2251f0cf2aff0d67a40`

## 1. Validation Suite Status

| Gate | Command | Result | Pass/Fail |
|---|---|---|---|
| Unit & Contract Tests | `npm test` | 163 tests passed across 4 files (including 10 new harness contracts) | PASS |
| Local Build | `npm run build` | Clean Vite + esbuild bundle | PASS |
| k6 Harness Contract Tests | Contract tests 1-10 in Vitest VM | Localhost, loopback, prod locks, /checkout, /admin, /orders, query/frag rejection all PASS | PASS |
| Local Reproducibility Run (Run 2) | `k6 run -e ... .\scripts\load\pl20-baseline.k6.js` | 35 requests, 0.997 req/s, 0.85ms p50, 11.27ms p95, 0 crashes | PASS |
| Side Effect & Log Audit | Server log inspection (`pino` JSON) | 0 mutations, 0 provider calls, 0 DB queries, 0 crashes, 5 x 503 on `/api/readiness` | PASS |

## 2. Key Verified Behaviors

- `normalizeBaseUrl` in `scripts/load/pl20-baseline.k6.js` uses deterministic regex URL parser compatible with k6 Goja engine.
- Rejection of query parameters (`?`) and fragments (`#`).
- Rejection of paths after root.
- Rejection of forbidden mutation routes (`/checkout`, `/admin`, `/orders`, `/refund`, `/payment`, `/webhook`).
- Production lock strictly enforced on `https://selfcaresinners.com`.
- Run 2 reproduced clean local baseline execution against exact tree to be committed.
- `capacity.local_baseline = MEASURED`.
- `finalScaleReady` strictly remains `false`.
- PL20-03 remains ACTIVE; PL21 NOT STARTED.
