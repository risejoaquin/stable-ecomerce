# CURRENT TASK

TASK ID: PL20-03E1-COST-EVIDENCE-INTAKE-VALIDATOR-FINAL-HOTFIX
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS / CLOSED; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03B PASS / CLOSED; PL20-03C PASS / CLOSED; PL20-03D PASS / CLOSED; PL20-03 ACTIVE; PL20-03E1 COMPLETE; PL21 NOT STARTED; COST_MEASURED = false; finalScaleReady = false)

## Objective

Implement anti-example and anti-placeholder protections in the PL20-03E1 dry-run cost evidence validator to prevent example templates or placeholder tokens from self-validating:
1. **Remove Default Example Execution (Task 1):** `validateCostEvidenceFile()` and the CLI runner require an explicit file path. Invocation without arguments fails closed (exit code 1) with `{"error": "explicit provider evidence input file is required"}`.
2. **Mark Example as Non-Evidence (Task 2):** Marked `AGENT_CONTEXT/evidence/post-launch-20/pl20-03e-provider-cost-input.example.json` with top-level `example_only: true`.
3. **Fail Closed on Example Input (Task 3):** Added top-level guard in `validateCostEvidence()` failing closed when `example_only: true`: sets `cost_total_state: "NOT_MEASURED"`, `isCostEvidenceMeasured: false`, all providers to `"NOT_MEASURED"`, and blocking reason `"example/template input cannot be accepted as provider evidence"`.
4. **Placeholder Safety Guard (Task 4):** Added `isPlaceholderValue()` rejecting `<...>`, `example`, `placeholder`, `sample-only`, and `unknown` across critical evidence and provenance fields (`evidence_reference`, `measured_at`, `provided_by`, `source_type`, `usage_metric`, `allocation_formula`).
5. **Validator Rules Preserved (Task 5):** Maintained common accounting period matching, Railway allocation models, Stripe actual fee exports, Supabase/Resend zero-cost free-tier provenance, and all-four-MEASURED derivation.
6. **Automated Unit Tests (Task 6):** Updated `tests/pl20/cost-evidence-validator.test.ts` to 19 tests verifying CLI failure on missing file, `example_only` rejection, placeholder rejection, and candidate evidence acceptance (19 passed, 0 failed; all 182 project tests passing).
7. **Documentation & Non-Persistence (Tasks 7, 8):** Documented core distinctions: `example != evidence`, `dry-run MEASURED != persisted COST_MEASURED`, `COST_MEASURED remains false`, and `finalScaleReady remains false`. Zero database calls, zero mutations to `operating_cost_summaries`, zero external API calls.

## Files Modified / Created

- `AGENT_CONTEXT/evidence/post-launch-20/pl20-03e-provider-cost-input.example.json` (modified)
- `scripts/pl20/validate-cost-evidence.mjs` (modified)
- `tests/pl20/cost-evidence-validator.test.ts` (modified)
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03e1-cost-evidence-validator.md` (updated)
- `AGENT_CONTEXT/06_CURRENT_TASK.md` (updated)
- `AGENT_CONTEXT/07_HANDOFF.md` (updated)
- `AGENT_CONTEXT/08_LAST_VALIDATION.md` (updated)
- `AGENT_CONTEXT/13_CHANGELOG.md` (updated)

## Verification Summary

- Lint: PASS (`tsc --noEmit`)
- Tests: 182 passed across 5 test files (`vitest run`)
- Build: PASS (`vite build && esbuild server.ts`)
- Release Gate: PASS (`validate-release.ps1`)
- Git Check: Clean (`git diff --check`)
- `COST_MEASURED`: Strictly `false`
- `finalScaleReady`: Strictly `false`
