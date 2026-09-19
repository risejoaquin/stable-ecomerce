# POST-LAUNCH 20 (PL20-03B Final Trust Hotfix): Release Gate Aggregation and Reviewed Security Authority

**Date:** 2026-09-19
**Phase:** POST-LAUNCH 20 (PL20-03B Final Trust Hotfix)
**Status:** READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03 AUTHORIZED / ACTIVE; PL20-03B HOTFIX COMPLETE; POST-LAUNCH 20 ACTIVE; PL21 NOT STARTED; `finalScaleReady` EXPECTED FALSE)
**Evaluated Commit Base:** `58255e9ac6ff1b54cc0530523d5f6d23207c22a4`

---

## 1. Executive Summary

During review of the initial PL20-03B implementation, two critical trust issues were identified:
1. **Premature Release Gate Manifest Emission:** The `quality-gate.json` manifest was emitted inside the `quality` job before the `e2e` job completed. This allowed `release_gate: PASS` to be generated even when E2E was still running, failing, or skipped.
2. **Unauthorized Review Authority Assertion:** The local execution agent (Antigravity) emitted `pl20-evidence/reviewed-security.json` with `reviewer_class = "chatgpt_web"` and `status = "PASS"`. Antigravity does not possess ChatGPT Web review authority and must never assert reviewer status. Furthermore, the artifact referenced an older commit (`77fef0eb2923751bd1f515187604343276948dba`) which was stale relative to the newer evaluated code.

This hotfix addresses both defects by restructuring GitHub Actions into a 3-job aggregate workflow, establishing strict boundaries between **Candidate Security Evidence** (agent-authored) and **Reviewed Security Evidence** (authorized reviewer only), enforcing commit SHA freshness, and securing the importer against unauthorized self-promotion.

---

## 2. Release Gate Aggregation Architecture

### 2.1 3-Job Architecture in `.github/workflows/quality-gate.yml`

The CI quality gate is partitioned into three independent jobs:
```
  [quality job]  -----\
                        +---> [aggregate job] (needs: [quality, e2e], if: always())
  [e2e job]      -----/
```

1. **`quality` Job:**
   - Runs linting (`tsc --noEmit`), unit/contract tests (`vitest`), production build (`vite build && esbuild`), secret scan (`scan-local-secrets.ps1`), core regression suites (`smoke-qa-release-e`, `smoke-mobile-ux-f`, `smoke-post-ux-c-hotfix-20`, `smoke-post-ux-c-hotfix-20-2`), and security baseline report (`validate-security-baseline.ps1`).
   - Emits step results into `pl20-evidence/quality.json`.
   - Uploads intermediate artifact: `pl20-evidence-quality-steps-<run_id>-<run_attempt>`.

2. **`e2e` Job:**
   - Runs on Ubuntu with dedicated Playwright Chromium browser (`npm run test:e2e`).
   - Emits test execution results into `pl20-evidence/e2e.json`.
   - Uploads dedicated artifact: `pl20-evidence-e2e-<run_id>-<run_attempt>`.

3. **`aggregate` Job (`needs: [quality, e2e]`, `if: always()`):**
   - Downloads both step artifacts: `pl20-evidence-quality-steps-<run_id>-<run_attempt>` and `pl20-evidence-e2e-<run_id>-<run_attempt>`.
   - Reads `quality.json` and `e2e.json`.
   - Determines `release_gate.status` using deterministic rules:
     - `quality.conclusion === 'success'` AND `e2e.conclusion === 'success'` => `release_gate = PASS`
     - `e2e.conclusion === 'skipped'` => `release_gate = NOT_MEASURED`
     - `quality.conclusion !== 'success'` OR `e2e.conclusion === 'failure'` => `release_gate = FAIL`
   - Emits the final unified manifest `pl20-evidence/quality-gate.json` marked with `workflow_job: "aggregate"`, `aggregate: true`.
   - Uploads final retainable artifact: `pl20-evidence-quality-gate-<run_id>-<run_attempt>`.

### 2.2 Importer Verification Rules (`src/server/ci/trusted-ci-importer.ts`)

In `verifyQualityGateImport`:
- Evaluates `job_conclusions.quality` and `job_conclusions.e2e`.
- If `e2e` is skipped or `dimensions.e2e.status === 'NOT_MEASURED'`, `release_gate.status` resolves to `NOT_MEASURED` (never `PASS`).
- If either job fails or conclusion is not `success`, `release_gate.status` resolves to `FAIL`.
- `release_gate.status` resolves to `PASS` ONLY if all quality dimensions pass, E2E succeeds, and both jobs have succeeded.

---

## 3. Security Review Authority: Candidate vs. Reviewed Security

### 3.1 Role Distinction

| Aspect | Candidate Security Evidence | Reviewed Security Evidence |
|---|---|---|
| **Author** | Antigravity / Codex / Automation | ChatGPT Web / Human Operator |
| **Origin** | `security_review_candidate` | `reviewed_security` |
| **Source Classification** | `CANDIDATE_EVIDENCE` | `REVIEWED_SECURITY_EVIDENCE` |
| **Status** | `PREPARED_FOR_REVIEW` (or `DRAFT`) | `PASS` or `PARTIAL` |
| **`reviewer_class`** | `null` / pending | `chatgpt_web` / `human_operator` / `security_reviewer` |
| **Satisfies Readiness?** | **NO** (`securityBlockersStatus = 'NOT_MEASURED'`) | **YES** (if 0 critical open blockers & fresh SHA) |

### 3.2 Antigravity Boundary Enforcement

- Local execution agents (Antigravity, Codex) are strictly prohibited from generating evidence with `reviewer_class = "chatgpt_web"` and `status = "PASS"`.
- `pl20-evidence/reviewed-security.json` is maintained as a candidate draft:
  ```json
  {
    "schema_version": "pl20-reviewed-security-v1",
    "candidate": true,
    "status": "PREPARED_FOR_REVIEW",
    "reviewer_class": null,
    "reviewed_at": null,
    "critical_open_count": 0,
    "high_open_count": 1
  }
  ```
- Importer enforcement (`verifyReviewedSecurityManifestInput`):
  - Draft candidates (`candidate === true`, `status === 'PREPARED_FOR_REVIEW'`, or `status === 'DRAFT'`) are explicitly rejected from satisfying reviewed security blockers.
  - Caller class verification: If `callerClass` is in `['antigravity', 'codex', 'agent', 'automation']` and attempts to claim `reviewer_class: 'chatgpt_web'`, it is rejected with `Antigravity/agent caller cannot self-issue or impersonate reviewer_class 'chatgpt_web'`.
  - Missing, empty, or pending `reviewer_class` is rejected with `Missing reviewer cannot PASS: reviewer_class is required and must be authorized`.

---

## 4. Commit Freshness Rule

- Concrete reviewed security evidence must strictly bind to the evaluated commit SHA.
- Any artifact referencing a prior commit (such as `77fef0eb2923751bd1f515187604343276948dba`) is considered **STALE** for subsequent evaluations.
- In `verifyReviewedSecurityManifestInput`:
  ```typescript
  if (evaluatedCommitSha && manifest.validated_commit_sha !== evaluatedCommitSha) {
    return {
      success: false,
      error: `Stale reviewed-security SHA rejected: manifest '${manifest.validated_commit_sha}' != evaluated '${evaluatedCommitSha}'`
    };
  }
  ```

---

## 5. Contract Tests (Task 6)

11 specific regression tests were added in `tests/api/functional-quality-contracts.test.ts` under suite `POST-LAUNCH 20 (PL20-03B Final Hotfix): Release Gate Aggregation and Reviewed Security Authority`:

1. `quality PASS + e2e FAIL => release_gate FAIL`
2. `quality PASS + e2e skipped => release_gate not PASS (NOT_MEASURED)`
3. `quality PASS + e2e PASS => release_gate PASS`
4. `final aggregate manifest generated after both jobs`
5. `stale reviewed-security SHA rejected`
6. `draft security candidate cannot satisfy security block`
7. `Antigravity-created candidate cannot impersonate chatgpt_web review`
8. `missing reviewer cannot PASS`
9. `current authorized reviewed manifest can PASS`
10. `PL20-02 trust boundary remains intact`
11. `finalScaleReady remains false`

All 136 tests in `functional-quality-contracts.test.ts` and all 153 tests across 4 test files pass cleanly.

---

## 6. Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (153/153 unit/contract tests across 4 files)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `npm run qa:release` (`.\scripts\qa\validate-release.ps1`): FINAL RESULT PASS (8/8 release gates)
- `git diff --check`: PASS (0 whitespace errors)
- `finalScaleReady`: Strictly `false`
