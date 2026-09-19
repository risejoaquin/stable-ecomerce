# POST-LAUNCH 20 — PL20-02 Final Hotfix: Trust Boundary (Never Trust Request-Body CI Assertions)

**Date:** 2026-09-19  
**Phase:** POST-LAUNCH 20  
**Task ID:** PL20-02-FINAL-HOTFIX-TRUST-BOUNDARY  
**Base Commit:** `e3d8b560e67df4cb5f7da82fe8c595747a1ad747`  
**Branch:** `main`  
**Result:** READY_FOR_CHATGPT_WEB_VALIDATION  

---

## 1. VULNERABILITY

In previous iterations of `PL20-02`:
- While `classifyCiDimension` checked for provenance fields (`evidence_reference`, `workflow_identity`, etc.), an admin could construct an HTTP request body to `POST /api/admin/final-scale/technical-assessment/run` with forged values (e.g. `run_id: '99999999'`, `workflow_identity: 'Selfcare Quality Gate'`).
- Because the evaluation function merely verified the presence of strings without tracking provenance origin, request-body payloads could successfully achieve `source_classification = 'VERIFIED_CI_EVIDENCE'`.
- Furthermore, `security_blockers.open_count = 0` could be submitted via request body or self-declare `source_classification = 'REVIEWED_SECURITY_EVIDENCE'` or `origin = 'reviewed_security'`, which could satisfy technical readiness.
- In `summary`, rows were evaluated based solely on their stored `source_classification` string without validating the origin marker or confirming that the workflow actually executes the claimed checks (specifically, `Selfcare Quality Gate` does not run Playwright E2E tests).

---

## 2. REQUEST BODY TRUST RULE

**Core Rule:** An admin request body to `POST /api/admin/final-scale/technical-assessment/run` is **NEVER** `VERIFIED_CI_EVIDENCE`.
- Any evidence submitted via `req.body.ciEvidence`, `req.body.ci_evidence`, or `req.body.dimensions` is strictly tagged with `origin: 'request_body'`.
- `classifyCiDimension` in `server.ts` has been updated so that incoming request body dimensions can **only** resolve to:
  - `MANUAL_EVIDENCE` (if status, valid commit SHA, and measured timestamp are provided)
  - `NOT_MEASURED` (if missing required attributes)
- It is mathematically and logically impossible for `classifyCiDimension` called during request-body processing to return `VERIFIED_CI_EVIDENCE`.
- Providing fake `run_id`, fake `workflow_identity`, or real current commit SHA in a request body never elevates its classification beyond `MANUAL_EVIDENCE`.

---

## 3. TRUSTED ORIGIN TAXONOMY & MODEL

The system enforces a server-controlled provenance taxonomy. The caller cannot self-declare their origin:

| Origin Identifier | Origin Meaning | Permitted Source Classifications | Can Satisfy Required Technical Dimensions? |
|---|---|---|---|
| `request_body` | Ingested via admin HTTP POST body. Caller cannot override. | `MANUAL_EVIDENCE`, `NOT_MEASURED` | **NO** |
| `persisted_trusted_import` | Ingested via trusted offline import script or cryptographic GitHub Actions runner integration. | `VERIFIED_CI_EVIDENCE` | **YES** (for automated CI dimensions) |
| `runtime` | Derived live by server container probes (DB latency, memory RSS, security baseline scanner). | `RUNTIME_OBSERVED` | **NO** (runtime cannot prove CI or scale capacity) |
| `reviewed_security` | Formally signed/reviewed security audit record. | `REVIEWED_SECURITY_EVIDENCE`, `PERSISTED_EVIDENCE` | **YES** (for `technical_security_blockers` if `open_count === 0`) |
| `persisted_database_evidence` | Formally verified Supabase schema migration history. | `PERSISTED_EVIDENCE` | **YES** (for `technical_database_reproducibility` only) |

---

## 4. SUMMARY DEFENSE-IN-DEPTH

In `GET /api/admin/final-scale/summary`:
- The server does not blindly trust stored `source_classification` strings.
- **Downgrade Rule:** If an assessment row claims `VERIFIED_CI_EVIDENCE` but its `origin` is not `persisted_trusted_import` (or is missing run reference / workflow identity), it is downgraded on the fly to `MANUAL_EVIDENCE`.
- **Database Downgrade Rule:** If a row claims `PERSISTED_EVIDENCE` but its `origin` is not in `['persisted_trusted_import', 'persisted_database_evidence']`, it is downgraded to `MANUAL_EVIDENCE`.
- **Required Dimension Gate:** `isCiDimSatisfied` requires:
  1. `allowedClassifications.includes(dim.classification)` (`VERIFIED_CI_EVIDENCE`, or `PERSISTED_EVIDENCE` for DB).
  2. `allowedOrigins.includes(dim.origin)` (`persisted_trusted_import`, or `persisted_database_evidence` for DB).
  3. `status === 'pass'`.
  4. `validated_commit_sha === targetSha`.
  5. `evidence_age_hours <= 24`.

---

## 5. SECURITY BLOCKER RULE

- If `security_blockers` is submitted via request body:
  - It receives `origin: 'request_body'` and `source_classification: 'MANUAL_EVIDENCE'`.
  - The caller cannot self-declare `REVIEWED_SECURITY_EVIDENCE` or `origin: 'reviewed_security'`.
- In `GET /api/admin/final-scale/summary`:
  - `isSecurityBlockersSatisfied` requires `open_count === 0`.
  - Permitted classifications: `VERIFIED_CI_EVIDENCE`, `PERSISTED_EVIDENCE`, or `REVIEWED_SECURITY_EVIDENCE`.
  - Permitted origins: `persisted_trusted_import`, `reviewed_security`, or `persisted_database_evidence`.
  - Any security blocker record originating from `request_body` or lacking a trusted origin fails `isSecurityBlockersSatisfied` and blocks `technicalRequiredPass`.

---

## 6. E2E TRUST GAP (PLAYWRIGHT VS QUALITY GATE)

- Repository inspection reveals that `Selfcare Quality Gate` (`.github/workflows/quality-gate.yml`) runs TypeScript lint, unit tests, build, and security scans — it does **NOT** run Playwright E2E tests (`e2e/*.spec.ts`).
- Any technical assessment claiming `assessment_key: 'technical_e2e'` with `workflow_identity: 'Selfcare Quality Gate'` is claiming a workflow that did not run it.
- **Server Enforcement:** In `GET /api/admin/final-scale/summary`, if `dim.assessment_key === 'technical_e2e'` and its workflow identity is `'Selfcare Quality Gate'`, it is downgraded to `MANUAL_EVIDENCE`.
- E2E remains `NOT_MEASURED` or `MANUAL_EVIDENCE` until a dedicated trusted E2E workflow (`Playwright E2E Runner`) or verified manifest import is executed.

---

## 7. REGRESSION TEST EVIDENCE

The test suite in `tests/api/functional-quality-contracts.test.ts` covers 19 permanent regression tests:

1. **Full fake request-body CI payload remains MANUAL_EVIDENCE:** Verified that `{ status: 'pass', run_id: '35422800421', workflow_identity: 'Selfcare Quality Gate' }` receives `classification: 'MANUAL_EVIDENCE'` and `origin: 'request_body'`.
2. **Fake run ID cannot become VERIFIED_CI_EVIDENCE:** Verified that providing `run_id: '99999999'` in request body yields `MANUAL_EVIDENCE`.
3. **Fake workflow name cannot become VERIFIED_CI_EVIDENCE:** Verified that providing `workflow_name: 'Selfcare Quality Gate'` yields `MANUAL_EVIDENCE`.
4. **Current SHA in manual payload does not increase trust:** Verified that providing current commit SHA still yields `MANUAL_EVIDENCE`.
5. **Request-body security blockers zero cannot satisfy readiness:** Verified that `{ open_count: 0 }` via request body is rejected for readiness (`isSecurityBlockersSatisfied: false`).
6. **Caller cannot self-declare REVIEWED_SECURITY_EVIDENCE:** Verified server overrides caller's classification and origin to `MANUAL_EVIDENCE` and `request_body`.
7. **Caller cannot self-declare persisted_trusted_import:** Verified server strips or overrides attempted origin spoofing.
8. **Persisted row claiming VERIFIED without trusted-origin marker is downgraded:** In summary, stored rows claiming `VERIFIED_CI_EVIDENCE` without `origin: 'persisted_trusted_import'` are downgraded to `MANUAL_EVIDENCE`.
9. **Trusted-origin + full persisted provenance is eligible:** Rows with `origin: 'persisted_trusted_import'` (or `persisted_database_evidence` for DB / `reviewed_security` for security) are eligible.
10. **Missing E2E trusted source keeps technicalRequiredPass false:** When E2E claims `Selfcare Quality Gate`, it is rejected, keeping `technicalRequiredPass: false`.
11. **finalScaleReady remains false:** Verified overall readiness remains false.
12. **Existing auth/security contracts remain green:** Unauthenticated access returns 401; non-admin token returns 403.
13-19. **Architecture & Isolation Retained:** Runtime isolation, capacity RSS/DB separation, commercial metadata with zero PII, low volume warning, partial provider cost failure, and legacy static baseline row isolation.

---

## 8. EXPECTED CURRENT PRODUCTION STATE

At the current state of production:
- `technicalEvidenceComplete`: `false`
- `technicalEvidenceCurrent`: `false`
- `technicalRequiredPass`: `false`
- `finalScaleReady`: `false`

The server does not make external runtime calls to the GitHub API, eliminating rate-limiting and token leakage risks while strictly sealing the trust boundary.
