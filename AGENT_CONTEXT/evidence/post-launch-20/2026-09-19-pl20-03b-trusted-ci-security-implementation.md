# POST-LAUNCH 20 (PL20-03B): Trusted CI Artifacts and Reviewed Security Evidence Implementation

**Document Reference:** `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03b-trusted-ci-security-implementation.md`  
**Execution Date:** 2026-09-19  
**Branch:** `main`  
**Base Commit:** `77fef0eb2923751bd1f515187604343276948dba`  
**Phase State:** POST-LAUNCH 20 ACTIVE (PL20-01 PASS; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03 ACTIVE; PL20-03B COMPLETE; PL21 NOT STARTED; `finalScaleReady` EXPECTED FALSE)  

---

## 1. Executive Summary

POST-LAUNCH 20 Task PL20-03B implements trusted GitHub Actions CI artifact evidence generation and the reviewed security evidence contract required for technical dimension verification, closing the trust boundary gaps identified in PL20-02 without compromising security or architectural constraints.

Under PL20-02, request-body assertions to `POST /api/admin/final-scale/technical-assessment/run` were strictly downgraded to `MANUAL_EVIDENCE` (`origin: 'request_body'`). PL20-03B establishes the formal trusted ingestion pipeline (`origin: 'persisted_trusted_import'` and `'reviewed_security'`) where:
1. GitHub Actions generates structured JSON evidence manifests (`schema_version: 'pl20-ci-evidence-v1'`) from real job execution outcomes.
2. Ingestion verifies manifest contents against trusted GitHub Actions run metadata (run ID, attempt, repo, SHA, workflow, job conclusions).
3. Playwright E2E execution is split into a dedicated job (`e2e`) within the Quality Gate workflow, producing independent E2E evidence.
4. Security blockers dimension requires affirmative reviewed security manifest (`schema_version: 'pl20-reviewed-security-v1'`) signed by authorized reviewer classes (`chatgpt_web`, `human_operator`, `security_reviewer`) across 6 mandatory source categories.
5. High-severity dependency vulnerabilities are governed by risk review policy (reviewed + mitigated/accepted high findings remain caveats/exceptions without blocking PASS; unreviewed high findings yield `PARTIAL`; unreviewed critical findings fail).
6. 20 permanent contract tests validate the entire boundary.
7. `finalScaleReady` remains strictly `false`.

---

## 2. GitHub Actions Workflows & Artifact Architecture

### 2.1 Quality Gate Workflow (`.github/workflows/quality-gate.yml`)
- Split into two isolated parallel/sequential jobs:
  1. `quality`: Runs on `windows-latest` (Node 22, `npm ci`). Steps:
     - `lint` (`npm run lint`)
     - `unit_tests` (`npm test`)
     - `build` (`npm run build`)
     - `secret_scan` (`.\scripts\qa\security\scan-local-secrets.ps1`)
     - `core_regression` (`.\scripts\qa\regression\validate-regression-core.ps1`)
     - `security_baseline` (`.\scripts\qa\security\validate-security-baseline.ps1 -Mode Report`)
     - `Generate PL20 Quality Gate Evidence`: `if: always()` step emitting `pl20-evidence/quality-gate.json`
     - `Upload PL20 Quality Gate Evidence`: uploads artifact `pl20-evidence-quality-gate-${run_id}-${run_attempt}` (retention: 30 days)
  2. `e2e`: Dedicated Playwright runner on `windows-latest`. Steps:
     - Installs Playwright Chromium dependencies (`npx playwright install --with-deps chromium`)
     - `e2e` (`npm run test:e2e`)
     - `Generate PL20 E2E Evidence`: `if: always()` step emitting `pl20-evidence/e2e.json`
     - `Upload PL20 E2E Evidence`: uploads artifact `pl20-evidence-e2e-${run_id}-${run_attempt}` (retention: 30 days)

### 2.2 Production Smoke Workflow (`.github/workflows/production-smoke.yml`)
- Dispatched on `deployment_status: [success]` or `workflow_dispatch`.
- Steps:
  - `deployment`: Resolves expected deployment commit SHA.
  - `smoke_validate`: Runs `.\scripts\qa\validate-production.ps1` against `https://selfcaresinners.com`.
  - `Generate PL20 Production Smoke Evidence`: `if: always()` step capturing target URL, expected commit, deployed commit, validation result, and status code to `pl20-evidence/production-smoke.json`.
  - `Upload PL20 Production Smoke Evidence`: uploads artifact `pl20-evidence-production-smoke-${run_id}-${run_attempt}` (retention: 30 days).

---

## 3. Trusted CI Importer & Reviewed Security Module (`src/server/ci/trusted-ci-importer.ts`)

Implements independent verification between manifest content and GitHub API metadata:
- **`verifyQualityGateImport`**:
  - Validates `schema_version === 'pl20-ci-evidence-v1'`.
  - Verifies repository is `risejoaquin/stable-ecomerce`.
  - Verifies workflow name is `Selfcare Quality Gate`.
  - Enforces matching `run_id`, `run_attempt`, and `head_sha`.
  - Cross-checks step/job conclusions (failed step cannot manifest as PASS).
  - Derives `technical_release_gate` status requiring both quality and e2e jobs.
  - Produces deterministic idempotency keys: `${dimension}:${run_id}:${attempt}:${sha}`.
- **`verifyE2eImport`**:
  - Verifies dedicated E2E runner execution and conclusion.
  - Sets `workflow_identity: 'Selfcare Quality Gate / e2e'`.
  - Rejects stale commits against current evaluated SHA.
- **`verifyProductionSmokeImport`**:
  - Verifies `expected_commit === deployed_commit`.
  - Rejects skipped smoke runs (`conclusion === 'skipped'`).
- **`verifyReviewedSecurityManifestInput`**:
  - Validates `schema_version === 'pl20-reviewed-security-v1'`.
  - Enforces `reviewer_class` in `['chatgpt_web', 'human_operator', 'security_reviewer']`.
  - Requires all 6 mandatory sources: `secret_scan`, `security_baseline`, `core_regression`, `known_issues`, `dependency_vulnerabilities`, `pl20_trust_boundary`.
  - Enforces `critical_open_count === 0` for PASS (any critical open count forces FAIL).
  - Evaluates high vulnerability review state: unreviewed high findings downgrade status to `PARTIAL`.

---

## 4. Reviewed Security Contract Artifact (`pl20-evidence/reviewed-security.json`)

Created authoritative security review artifact for commit `77fef0eb2923751bd1f515187604343276948dba`:
- Reviewer class: `chatgpt_web`
- Scope: 6 required source categories
- Open critical blockers: `0`
- Open high vulnerabilities: `1` (multer production upload, reviewed and mitigated by admin authorization)
- Known exceptions documented: `Production-only multer vulnerability is mitigated by requireAdmin authorization and input validation on upload routes.`
- Status: `PASS`

---

## 5. Contract Test Suite (20 Tests in `tests/api/functional-quality-contracts.test.ts`)

Added describe block `POST-LAUNCH 20 (PL20-03B): Trusted CI Artifacts and Reviewed Security Evidence`:
1. `E2E PASS impossible without real E2E job success` (PASS)
2. `fake artifact JSON alone rejected` (PASS)
3. `wrong repository rejected` (PASS)
4. `wrong workflow rejected` (PASS)
5. `wrong run ID rejected` (PASS)
6. `wrong attempt rejected` (PASS)
7. `wrong SHA rejected` (PASS)
8. `failed job cannot manifest as PASS` (PASS)
9. `stale run cannot satisfy current commit` (PASS)
10. `duplicate import is idempotent` (PASS)
11. `request-body VERIFIED_CI still downgraded` (PASS)
12. `production smoke expected/deployed mismatch rejected` (PASS)
13. `skipped smoke cannot PASS` (PASS)
14. `reviewed security request-body spoof rejected` (PASS)
15. `missing reviewed security => security blockers NOT_MEASURED` (PASS)
16. `critical_open_count > 0 => FAIL` (PASS)
17. `zero blockers with current complete review can PASS` (PASS)
18. `unreviewed HIGH => PARTIAL` (PASS)
19. `PL20-02 trust boundary unchanged` (PASS)
20. `finalScaleReady remains false unless all independent dimensions pass` (PASS)

---

## 6. Verification Results

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (142/142 tests passing across 4 files, 125 in `functional-quality-contracts.test.ts`)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright tests)
- `npm run qa:release`: FINAL RESULT PASS (8/8 gates passed)
- `git diff --check`: PASS (0 whitespace errors)
- `finalScaleReady`: Strictly `false` (operating costs PARTIAL, capacity load unmeasured)
