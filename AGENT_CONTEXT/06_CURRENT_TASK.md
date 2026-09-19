# CURRENT TASK

TASK ID: PL20-02-HOTFIX-TRUSTED-TECHNICAL-EVIDENCE
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS; PL20-02 HOTFIX PASS; POST-LAUNCH 20 ACTIVE; DO NOT START PL20-03; DO NOT START PL21; DO NOT CLOSE POST-LAUNCH 20)

## Objective

Fix two critical evidence-integrity gaps in POST-LAUNCH 20:
1. **Security Blockers Evidence Fix:** Missing security-blocker evidence now strictly evaluates to `status = 'NOT_MEASURED'`, `open_count = null`, `classification = 'NOT_MEASURED'`. Removed default fallback to `PASS` / `open_count = 0`. Zero open blockers (`open_count === 0`) evaluates to `PASS` only when backed by valid verified/persisted evidence. If `open_count > 0`, evaluates to `FAIL`.
2. **Trusted Technical Evidence Ingestion & Classification:** Distinguish `VERIFIED_CI_EVIDENCE`, `PERSISTED_EVIDENCE`, `RUNTIME_OBSERVED`, `MANUAL_EVIDENCE`, and `NOT_MEASURED`. Arbitrary admin requests without complete provenance (`evidence_reference`, `workflow_identity`, `validated_commit_sha`, `measured_at`) are classified as `MANUAL_EVIDENCE` and strictly cannot satisfy `technicalRequiredPass`.
3. **Removal of Deployed SHA Fallback for CI Claims:** Removed all `dim.validated_commit_sha || currentCommitSha` fallbacks. Missing `validated_commit_sha` produces `status = 'not_measured'`, `validated_commit_sha = null`, `classification = 'MANUAL_EVIDENCE'`. Mismatched SHA resolves to `STALE`. Missing `measured_at` resolves to `NOT_MEASURED`.
4. **Safe Evidence Reference Support:** Ingestion records `evidence_reference` (e.g. `run:35422800421`), `workflow_identity`, and `open_count` without storing or logging secrets.
5. **Deterministic Production Readiness:** In production, `technicalRequiredPass` and `finalScaleReady` evaluate strictly to `false` until trusted CI evidence is ingested and capacity/costs are measured.
6. **Task 9 Verification Tests:** Added 19 comprehensive contract tests covering all 12 hotfix requirements, capacity RSS/DB separation, commercial metadata with no PII, low volume caveats, partial provider cost failure, and legacy row isolation.

## Files modified

- `server.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-02-hotfix-trusted-technical-evidence.md`

## Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (102/102 tests passed across 4 files, 85 in functional-quality-contracts)
- `npm run build`: PASS (Vite + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright tests)
- `.\scripts\qa\validate-release.ps1`: FINAL RESULT PASS (8/8 gates passed)
- `git diff --check`: PASS (0 whitespace errors)
