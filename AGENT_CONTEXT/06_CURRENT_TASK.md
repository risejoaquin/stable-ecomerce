# CURRENT TASK

TASK ID: PL20-03B-FINAL-TRUST-HOTFIX
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03 AUTHORIZED / ACTIVE; PL20-03B HOTFIX COMPLETE; POST-LAUNCH 20 ACTIVE; PL21 NOT STARTED; finalScaleReady EXPECTED FALSE)

## Objective

Remediate Release Gate aggregation timing and enforce reviewed security authority boundaries:
1. **Aggregate Release Gate:** Restructure `.github/workflows/quality-gate.yml` into a 3-job architecture (`quality` -> `e2e` -> `aggregate`). The `aggregate` job executes with `if: always()`, downloads intermediate step artifacts (`quality.json` and `e2e.json`), evaluates job outcomes, and generates the final `quality-gate.json` manifest. `release_gate` status is `PASS` ONLY if both `quality` and `e2e` jobs succeed. If `e2e` is skipped, `release_gate` is `NOT_MEASURED` (never `PASS`). If either job fails, `release_gate` is `FAIL`.
2. **Reviewed Security Authority:** Revoke unauthorized self-assertion of ChatGPT Web review authority. Demote `pl20-evidence/reviewed-security.json` to a non-authoritative candidate draft (`candidate: true`, `status: "PREPARED_FOR_REVIEW"`, `reviewer_class: null`). Candidate evidence prepared by Antigravity cannot satisfy security blockers.
3. **Commit SHA Freshness:** Stale reviewed-security evidence referencing prior commits is rejected. Concrete reviewed-security evidence must match the evaluated commit SHA.
4. **Importer Enforcement:** In `src/server/ci/trusted-ci-importer.ts`, reject draft candidates, missing reviewer, agent self-issued `chatgpt_web` reviewer authority, or stale SHAs. Export candidate preparation helper (`verifySecurityReviewCandidate`).
5. **Contract Tests:** Add 11 regression tests in `tests/api/functional-quality-contracts.test.ts` proving all aggregation and authority rules. Total test suite: 153 tests passing across repository (136 in `functional-quality-contracts.test.ts`).

## Files modified

- `.github/workflows/quality-gate.yml`
- `pl20-evidence/reviewed-security.json`
- `server.ts`
- `src/server/ci/trusted-ci-importer.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03b-final-trust-hotfix.md`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`

## Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (153/153 tests passed across 4 files, 136 in `functional-quality-contracts.test.ts`)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `npm run qa:release` (`.\scripts\qa\validate-release.ps1`): FINAL RESULT PASS (8/8 release gates passed)
- `git diff --check`: PASS (0 whitespace errors)
- `finalScaleReady`: Strictly `false`
