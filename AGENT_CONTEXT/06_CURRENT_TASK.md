# CURRENT TASK

TASK ID: PL20-02-FINAL-HOTFIX-TRUST-BOUNDARY
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS; PL20-02 FINAL HOTFIX PASS; POST-LAUNCH 20 ACTIVE; DO NOT START PL20-03; DO NOT START PL21; DO NOT CLOSE POST-LAUNCH 20)

## Objective

Close the trust boundary vulnerability where request-body assertions could claim `VERIFIED_CI_EVIDENCE`:
1. **Request Body Never Verified CI:** Any evidence submitted in `req.body.ciEvidence`, `req.body.ci_evidence`, or `req.body.dimensions` is classified strictly as `MANUAL_EVIDENCE` or `NOT_MEASURED` with server-enforced `origin: 'request_body'`. It can never become `VERIFIED_CI_EVIDENCE`.
2. **Provenance Origin Taxonomy:** Strictly distinguish `origin = 'request_body'`, `'persisted_trusted_import'`, `'runtime'`, `'reviewed_security'`, and `'persisted_database_evidence'`. Caller cannot self-declare server-trusted origins.
3. **Summary Defense-in-Depth:** In `GET /api/admin/final-scale/summary`, rows claiming `VERIFIED_CI_EVIDENCE` without `origin === 'persisted_trusted_import'` are downgraded to `MANUAL_EVIDENCE`.
4. **Security Blockers Origin Rule:** `security_blockers.open_count = 0` from request body receives `origin: 'request_body'` and cannot satisfy readiness.
5. **E2E Trust Gap:** `Selfcare Quality Gate` does not run Playwright E2E. E2E claiming Quality Gate is downgraded to `MANUAL_EVIDENCE`.
6. **Current Expected Production State:** `technicalEvidenceComplete = false`, `technicalEvidenceCurrent = false`, `technicalRequiredPass = false`, `finalScaleReady = false`.
7. **Task 8 Regression Tests:** 19 comprehensive contract tests covering all trust boundary rules, E2E workflow distinction, security blocker gates, and non-admin 401/403 authorization.

## Files modified

- `server.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-02-final-trust-boundary-hotfix.md`

## Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (102/102 tests passed across 4 files, 85 in functional-quality-contracts)
- `npm run build`: PASS (Vite + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright tests)
- `.\scripts\qa\validate-release.ps1`: FINAL RESULT PASS (8/8 gates passed)
- `git diff --check`: PASS (0 whitespace errors)
