# POST-LAUNCH 20 — PL20-02 Hotfix: Trusted Technical Evidence Ingestion

Date: 2026-09-19
Phase: POST-LAUNCH 20
Task ID: PL20-02-HOTFIX-TRUSTED-TECHNICAL-EVIDENCE
Base Commit: `dbea84b94098e31e04e930f209f480f87cfb0b6a`
Branch: `main`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

---

## 1. BEFORE (Vulnerabilities and Gaps Identified)

Prior to this hotfix:
1. **Security Blockers False PASS Default:** In `server.ts`, if `technical_security_blockers` was missing or omitted from assessment runs or active table rows, the system checked for active critical risks/debts, and when none were open, defaulted `open_count = 0` and `status = 'PASS'`. This allowed unassessed security state to falsely pass the technical readiness gate.
2. **Untrusted Admin Assertion Impersonation:** An arbitrary admin HTTP request payload containing `{ status: 'pass' }` without verified execution provenance could be classified as `CI_EVIDENCE`, allowing unproven runtime claims to impersonate automated CI runs.
3. **Implicit SHA Fallback:** In `POST /api/admin/final-scale/technical-assessment/run`, if `validated_commit_sha` was missing from incoming claims, the code fell back to `currentCommitSha`, allowing external payloads to silently claim the deployed commit SHA.
4. **Missing Provenance Ignored:** Claims missing execution timestamps (`measured_at`), workflow identifiers, or immutable evidence run references (`evidence_reference`) were still accepted as valid CI evidence.

---

## 2. TRUST MODEL & TAXONOMY

The evidence ingestion and readiness model now strictly distinguishes five mutually exclusive evidence classes:

| Evidence Classification | Definition | Allowed to Satisfy Required CI Dimensions? | Allowed to Satisfy Security Blockers? |
|---|---|---|---|
| `VERIFIED_CI_EVIDENCE` | Provenanced output from GitHub Actions or automated test runners with immutable `evidence_reference` (e.g. `run:<id>`), `workflow_identity`, matching `validated_commit_sha`, fresh `measured_at`, and clean completion. | Yes | Yes (if `open_count === 0`) |
| `PERSISTED_EVIDENCE` | Authoritative persisted repository/migration state, such as Supabase migration version control (`database_reproducibility`) or reviewed audit records. | Permitted for `database_reproducibility` only | Yes (if `open_count === 0` under reviewed audit) |
| `RUNTIME_OBSERVED` | Measurements derived dynamically by the live running container (e.g. RSS memory usage, active DB pool connectivity, JWT middleware presence). Forbidden from proving scale capacity or CI test passes. | No | No |
| `MANUAL_EVIDENCE` | Admin/operator assertions, claims lacking run IDs, or claims lacking cryptographic/workflow provenance. Informational only. | Strictly NO | Strictly NO |
| `NOT_MEASURED` | Absence of measurement, unmeasured dimension, missing required field, or missing `validated_commit_sha`. | No | No |

---

## 3. VERIFIED_CI_EVIDENCE CONTRACT

To qualify as `VERIFIED_CI_EVIDENCE`, an incoming assessment claim must satisfy all six provenance attributes:
1. `status`: Must be `'pass'` or `'fail'` (never undefined or empty).
2. `validated_commit_sha`: Explicit commit SHA against which tests executed (non-empty string).
3. `measured_at`: Explicit completion/execution timestamp (ISO 8601).
4. `source_type`: Authoritative source type (e.g. `ci_pipeline`, `test_runner`, `build_system`, `security_scanner`).
5. `evidence_reference`: Explicit run identifier (e.g. `run:35422800421` or GitHub Actions URL).
6. `workflow_identity`: Explicit workflow identifier (e.g. `Selfcare Quality Gate`, `Selfcare Production Smoke`).

If any of these attributes are missing, the claim is automatically downgraded to `MANUAL_EVIDENCE` or `NOT_MEASURED` at both ingestion and summary evaluation.

---

## 4. MANUAL_EVIDENCE HANDLING

- Incoming admin assertions without full provenance (`evidence_reference` or `workflow_identity`) are classified as `MANUAL_EVIDENCE`.
- In `GET /api/admin/final-scale/summary`, required CI dimensions check `conf.allowedClassifications.includes(dim.classification)`.
- Because `MANUAL_EVIDENCE` is excluded from `allowedClassifications` for all required CI dimensions, manual assertions alone can NEVER satisfy `isCiDimSatisfied` or `technicalRequiredPass`.

---

## 5. SECURITY BLOCKER FIX

The security blocker evaluation was completely re-engineered:
- **Absence of Evidence:** If no active `technical_security_blockers` record exists, the system evaluates:
  - `status: 'NOT_MEASURED'`
  - `open_count: null`
  - `classification: 'NOT_MEASURED'`
- **Missing Explicit Count:** If `open_count` is `null`, `undefined`, or `NaN`, the dimension resolves to `status: 'NOT_MEASURED'`, `open_count: null`.
- **Zero Open Blockers:** `status: 'PASS'` is resolved IF AND ONLY IF `open_count === 0`, and the source classification is one of `['VERIFIED_CI_EVIDENCE', 'PERSISTED_EVIDENCE', 'REVIEWED_SECURITY_EVIDENCE']`.
- **Open Blockers Present:** If `open_count > 0`, the dimension resolves to `status: 'FAIL'`, preventing technical pass regardless of classification.
- **Readiness Gate:** `technicalRequiredPass` strictly checks `isSecurityBlockersSatisfied()`:
  - `sec.status === 'PASS'`
  - `sec.open_count === 0`
  - `allowed.includes(sec.classification)`

---

## 6. SHA BINDING & REMOVAL OF DEPLOYED FALLBACK

- Removed all fallback logic of the form `dim.validated_commit_sha || currentCommitSha`.
- In `classifyCiDimension`:
  - If `validated_commit_sha` is absent or empty: returns `status: 'not_measured'`, `classification: 'MANUAL_EVIDENCE'`, `validatedCommitSha: null`.
- In `GET /api/admin/final-scale/summary`:
  - If `validatedSha` does not equal `currentCommitSha` (or if `currentCommitSha` is missing): dimension resolves to `status: 'STALE'`, failing `technicalEvidenceCurrent` and `technicalRequiredPass`.

---

## 7. EVIDENCE REFERENCE SUPPORT

- Both ingestion (`classifyCiDimension`) and persistence store:
  - `evidence_reference` (e.g. `run:35422800421` or GitHub Actions run ID) in `evidence` and `metadata`.
  - `workflow_identity` (e.g. `Selfcare Quality Gate`) in `evidence` and `metadata`.
  - `open_count` for security blocker tracking.
- Summary endpoint extracts and exposes `evidence_reference` and `workflow_identity` under `evaluationRules.technicalDimensions[dimKey]`.
- No sensitive tokens, API secrets, or private keys are accepted or logged.

---

## 8. TECHNICAL REQUIRED READINESS RULE

In `GET /api/admin/final-scale/summary`:
- 7 CI/schema required dimensions: `release_gate`, `production_smoke`, `build`, `unit_tests`, `e2e`, `secret_scan`, `database_reproducibility`.
- 1 security blocker dimension: `security_blockers`.
- Derivation:
  ```ts
  const technicalEvidenceComplete = requiredDimensionConfigs.every(c => technicalDimensions[c.id].status !== 'NOT_MEASURED') &&
                                    technicalDimensions.security_blockers.status !== 'NOT_MEASURED';

  const technicalEvidenceCurrent = requiredDimensionConfigs.every(c => technicalDimensions[c.id].status !== 'STALE' && technicalDimensions[c.id].status !== 'NOT_MEASURED') &&
                                   technicalDimensions.security_blockers.status !== 'STALE' &&
                                   technicalDimensions.security_blockers.status !== 'NOT_MEASURED';

  const technicalRequiredPass = Boolean(
    technicalEvidenceComplete &&
    technicalEvidenceCurrent &&
    requiredDimensionConfigs.every(c => isCiDimSatisfied(c)) &&
    isSecurityBlockersSatisfied()
  );
  ```

---

## 9. AUTOMATED TEST SUITE (Task 9)

All 12 required test specifications were implemented in `tests/api/functional-quality-contracts.test.ts`:
1. `missing security blocker evidence => NOT_MEASURED, not PASS`: Verified `open_count: null`, `status: 'NOT_MEASURED'`, `technicalRequiredPass: false`.
2. `security open_count=0 only passes with valid evidence`: Verified `open_count: 0` with `VERIFIED_CI_EVIDENCE` and current SHA yields `status: 'PASS'`.
3. `security open_count>0 => FAIL`: Verified `open_count: 2` yields `status: 'FAIL'`, `technicalRequiredPass: false`.
4. `admin body with {status: pass} but no provenance is not VERIFIED_CI_EVIDENCE`: Verified missing `evidence_reference` and `workflow_identity` is classified as `MANUAL_EVIDENCE`.
5. `missing validated_commit_sha cannot use deployed SHA fallback`: Verified missing SHA yields `status: 'not_measured'`, `validated_commit_sha: null`.
6. `mismatched SHA => STALE`: Verified evidence validated for commit A against current commit B yields `status: 'STALE'`.
7. `missing measured_at => NOT_MEASURED`: Verified claim without `measured_at` yields `status: 'NOT_MEASURED'`.
8. `manual evidence cannot satisfy technicalRequiredPass`: Verified `MANUAL_EVIDENCE` with `status: 'pass'` yields `technicalRequiredPass: false`.
9. `verified current CI evidence can satisfy one required dimension`: Verified single dimension satisfies its contract when provenanced.
10. `all verified required dimensions + security zero => technicalRequiredPass true`: Verified complete set of 8 required dimensions satisfies `technicalRequiredPass: true`.
11. `missing one required dimension => false`: Verified omitting any one dimension (e.g. `unit_tests`) leaves `technicalEvidenceComplete: false` and `technicalRequiredPass: false`.
12. `finalScaleReady remains false while costs/capacity unmeasured`: Verified that even with `technicalRequiredPass: true` and commercial measured, `finalScaleReady` remains `false`.
13-19. Additional tests proving runtime RSS/DB isolation from capacity, commercial metadata with zero PII, low-volume warning caveats, partial cost failure, and legacy static row isolation.

---

## 10. CURRENT EXPECTED READINESS IN PRODUCTION

- `technicalRequiredPass`: **`false`** (until verified CI evidence is ingested under the trusted contract).
- `isCapacityLoadMeasured`: **`false`** (load concurrency testing not yet run in production).
- `isCostEvidenceMeasured`: **`false`** (operating costs not yet measured across all 4 providers).
- `finalScaleReady`: **`false`** (deterministic derivation from unmeasured capacity, costs, and CI ingestion).

---

## 11. VERIFICATION EVIDENCE

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (102/102 tests passed across 4 files, 85 in `functional-quality-contracts.test.ts`)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright tests)
- `.\scripts\qa\validate-release.ps1`: FINAL RESULT PASS (8/8 release gates)
- `git diff --check`: PASS (0 whitespace errors)
