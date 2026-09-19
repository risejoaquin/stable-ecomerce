# LAST VALIDATION

**Timestamp:** 2026-09-18T23:08:15-07:00
**Phase:** POST-LAUNCH 20 (PL20-03A: Real Operating Cost Snapshot & Measurement Infrastructure)
**Branch:** `main`
**Base Commit:** `6a2b265bc29601c1f2143bf4b99a7a7b9e637e6d`

## 1. Validation Suite Status

| Gate | Command | Result | Pass/Fail |
|---|---|---|---|
| TypeScript | `npm run lint` | 0 errors | PASS |
| Unit & API Tests | `npm test` | 116 tests passed across 4 files (99 in functional-quality-contracts) | PASS (116/116) |
| Production Build | `npm run build` | Vite client + esbuild server bundle | PASS |
| E2E Tests | `npm run test:e2e` | 20 tests passed across 3 spec files | PASS (20/20) |
| Secret Scan | `.\scripts\qa\security\scan-local-secrets.ps1` | 0 secrets detected | PASS |
| Resend Webhook Security | `.\scripts\qa\security\validate-resend-webhook-signature.ps1` | All checks pass | PASS |
| Legacy Upload Auth | `.\scripts\qa\security\validate-legacy-upload-authorization.ps1` | All checks pass | PASS |
| Security Baseline Report | `.\scripts\qa\security\validate-security-baseline.ps1 -Mode Report` | Report executed cleanly | PASS |
| Core Regression | `smoke-qa-release-e`, `smoke-mobile-ux-f`, `smoke-post-ux-c-hotfix-20`, `smoke-post-ux-c-hotfix-20-2` | 4/4 suites passing | PASS |
| Release Gate | `npm run qa:release` (`.\scripts\qa\validate-release.ps1`) | All 8 release gates passed | PASS |
| Git Diff Check | `git diff --check` | 0 whitespace or formatting errors | PASS |

## 2. Key Verified Behaviors

- Railway 192 MXN across 4 hosts with `shared_unallocated` is classified as `PARTIAL` and not divided by 4.
- Supabase zero cost with free-tier provenance is classified as `MEASURED`.
- Resend zero cost with free-tier provenance is classified as `MEASURED`.
- Zero cost without free-tier provenance is rejected as `PARTIAL`.
- Stripe fee structure without actual monthly export is classified as `PARTIAL`.
- Stripe with provider export provenance is classified as `MEASURED`.
- Unknown values are not summed as zero; partial providers make cost total `PARTIAL`.
- `isCostEvidenceMeasured` strictly requires all four providers to be `MEASURED`.
- `CAPACITY_BASELINE_MEASURED = false`, `CAPACITY_SCALE_MEASURED = false`, and `isCapacityLoadMeasured = false`.
- Single container RSS and DB connectivity do not alter capacity flags.
- Request-body CI assertions continue to resolve strictly to `MANUAL_EVIDENCE` with `origin: 'request_body'`.
- `finalScaleReady` evaluates strictly to `false`.
