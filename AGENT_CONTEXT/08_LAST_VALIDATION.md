# LAST VALIDATION

**Timestamp:** 2026-09-17T23:25:00-07:00
**Phase:** POST-LAUNCH 20 (PL20-01 Provenance & Anomaly Contract)
**Branch:** `main`
**Base Commit:** `f4b8cf1e1821f8004e135c1b765d21675b3453ad`

## 1. Validation Suite Status

| Gate | Command | Result | Pass/Fail |
|---|---|---|---|
| TypeScript | `npm run lint` | 0 errors | PASS |
| Unit & API Tests | `npm test` | 83 tests passed across 4 files (66 in functional-quality-contracts) | PASS (83/83) |
| Production Build | `npm run build` | Vite client + esbuild server bundle | PASS |
| E2E Tests | `npm run test:e2e` | 20 tests passed across 3 spec files | PASS (20/20) |
| Secret Scan | `.\scripts\qa\security\scan-local-secrets.ps1` | 0 secrets detected | PASS |
| Resend Webhook Security | `.\scripts\qa\security\validate-resend-webhook-signature.ps1` | All checks pass | PASS |
| Legacy Upload Auth | `.\scripts\qa\security\validate-legacy-upload-authorization.ps1` | All checks pass | PASS |
| Security Baseline Report | `.\scripts\qa\security\validate-security-baseline.ps1 -Mode Report` | Report executed cleanly | PASS |
| Core Regression | `smoke-qa-release-e`, `smoke-mobile-ux-f`, `smoke-post-ux-c-hotfix-20`, `smoke-post-ux-c-hotfix-20-2` | 4/4 suites passing | PASS |
| Release Gate | `powershell -ExecutionPolicy Bypass -File .\scripts\qa\validate-release.ps1` | All 8 release gates passed | PASS |
| Git Diff Check | `git diff --check` | 0 whitespace or formatting errors | PASS |

## 2. Key Verified Behaviors

- Anomaly conflict detection: `cancelado + reconciled` orders excluded from revenue math, anomaly logged in evidence, `measured_state: 'PARTIAL'`.
- `PARTIAL` operating costs do not satisfy `finalScaleReady` (`isCostEvidenceMeasured === false`, `finalScaleReady === false`).
- Low commercial volume without anomalies is `MEASURED` with `score: null`.
- `NOT_APPLICABLE` is strictly rejected for active production stack components (Railway, Supabase, Stripe, Resend) and load capacity with HTTP 400.
- Provenance validation classifies rows lacking complete V1 metadata as `HISTORICAL_STATIC_BASELINE` and counts them under `historicalBaselineRows`.
