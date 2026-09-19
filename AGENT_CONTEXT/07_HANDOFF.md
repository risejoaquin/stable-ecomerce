# HANDOFF

Previous agent: Codex / Antigravity
Next agent: ChatGPT Web
Phase: POST-LAUNCH 20 — PL20-02 Final Hotfix: Trust Boundary (Never Trust Request-Body CI Assertions)
Task ID: PL20-02-FINAL-HOTFIX-TRUST-BOUNDARY
Working tree status:
- Base commit: `e3d8b560e67df4cb5f7da82fe8c595747a1ad747`
- Branch: `main`
- Status: `READY_FOR_CHATGPT_WEB_VALIDATION` (PL20-01 PASS; PL20-02 FINAL HOTFIX PASS; POST-LAUNCH 20 ACTIVE; DO NOT START PL20-03; DO NOT START PL21; DO NOT CLOSE POST-LAUNCH 20)

## Summary of Completed Hotfix Implementations

1. **Request Body Never Verified CI:**
   - Any evidence submitted via `req.body.ciEvidence`, `req.body.ci_evidence`, or `req.body.dimensions` is tagged with `origin: 'request_body'`.
   - `classifyCiDimension` in `server.ts` returns `MANUAL_EVIDENCE` (or `NOT_MEASURED`). It is impossible for request body inputs to become `VERIFIED_CI_EVIDENCE`.
   - Faking `run_id`, `workflow_identity`, or real current SHA in request body does not elevate trust.

2. **Provenance Origin Taxonomy:**
   - Server enforces origins: `request_body`, `persisted_trusted_import`, `runtime`, `reviewed_security`, and `persisted_database_evidence`.
   - Caller cannot self-declare or override origin.

3. **Summary Defense-in-Depth:**
   - In `GET /api/admin/final-scale/summary`, rows claiming `VERIFIED_CI_EVIDENCE` without `origin === 'persisted_trusted_import'` are downgraded on the fly to `MANUAL_EVIDENCE`.
   - Database rows claiming `PERSISTED_EVIDENCE` without trusted database origins are downgraded to `MANUAL_EVIDENCE`.

4. **Security Blockers Origin Rule:**
   - `security_blockers.open_count = 0` via request body receives `origin: 'request_body'` and cannot satisfy readiness.
   - Caller cannot self-declare `REVIEWED_SECURITY_EVIDENCE` or `origin: 'reviewed_security'`.
   - Summary requires trusted security origin (`persisted_trusted_import`, `reviewed_security`, or `persisted_database_evidence`).

5. **E2E Trust Gap Addressed:**
   - `Selfcare Quality Gate` does not run Playwright E2E tests.
   - Any claim for `technical_e2e` with `workflow_identity: 'Selfcare Quality Gate'` is downgraded to `MANUAL_EVIDENCE`.
   - E2E remains `NOT_MEASURED` / `MANUAL_EVIDENCE` until a dedicated trusted runner or import is run.

6. **Current Expected Production State:**
   - `technicalEvidenceComplete = false`
   - `technicalEvidenceCurrent = false`
   - `technicalRequiredPass = false`
   - `finalScaleReady = false`

7. **Contract Test Suite:**
   - 19 comprehensive contract tests in `tests/api/functional-quality-contracts.test.ts` covering all Task 8 requirements.

## Validation Gates

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (102/102 tests passed across 4 files, 85 in functional-quality-contracts)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `.\scripts\qa\validate-release.ps1`: FINAL RESULT PASS (8/8 release gates)
- `git diff --check`: PASS (0 whitespace errors)
