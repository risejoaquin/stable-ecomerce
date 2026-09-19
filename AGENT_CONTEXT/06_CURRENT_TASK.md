# CURRENT TASK

TASK ID: PL20-03B-TRUSTED-CI-SECURITY-IMPLEMENTATION
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03 AUTHORIZED / ACTIVE; PL20-03B COMPLETE; POST-LAUNCH 20 ACTIVE; PL21 NOT STARTED; finalScaleReady EXPECTED FALSE)

## Objective

Establish trusted CI artifact evidence generation and reviewed security evidence contracts without weakening the PL20-02 trust boundary:
1. **GitHub Actions Workflows:** Update `.github/workflows/quality-gate.yml` and `.github/workflows/production-smoke.yml` to generate structured JSON manifests (`pl20-ci-evidence-v1`) and upload retained artifacts.
2. **Dedicated E2E Runner:** Isolate Playwright E2E into dedicated `e2e` job in `quality-gate.yml` with separate artifact generation (`pl20-evidence-e2e-<run_id>-<run_attempt>`).
3. **Independent Verification:** Implement `src/server/ci/trusted-ci-importer.ts` cross-checking manifest payloads against trusted GitHub API run metadata.
4. **Reviewed Security Manifest:** Implement `pl20-evidence/reviewed-security.json` (`pl20-reviewed-security-v1`) covering 6 mandatory source categories and documented risk acceptance for non-critical high dependency vulnerabilities.
5. **Contract Test Suite:** Add 20 comprehensive contract tests in `tests/api/functional-quality-contracts.test.ts` verifying all 20 PL20-03B requirements.
6. **Integrity Preservation:** `finalScaleReady` remains strictly `false`. PL20-03 remains ACTIVE; PL21 NOT STARTED.

## Files modified

- `.github/workflows/quality-gate.yml`
- `.github/workflows/production-smoke.yml`
- `server.ts`
- `src/server/ci/trusted-ci-importer.ts`
- `pl20-evidence/reviewed-security.json`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03b-trusted-ci-security-implementation.md`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`

## Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (142/142 tests passed across 4 files, 125 in `functional-quality-contracts.test.ts`)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `npm run qa:release` (`.\scripts\qa\validate-release.ps1`): FINAL RESULT PASS (8/8 gates passed)
- `git diff --check`: PASS (0 whitespace errors)
- `finalScaleReady`: Strictly `false`
