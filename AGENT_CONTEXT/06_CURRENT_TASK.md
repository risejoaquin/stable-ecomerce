# CURRENT TASK

TASK ID: PL20-03E1-COST-EVIDENCE-INTAKE-VALIDATOR
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS / CLOSED; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03B PASS / CLOSED; PL20-03C PASS / CLOSED; PL20-03D PASS / CLOSED; PL20-03 ACTIVE; PL20-03E1 COMPLETE; PL21 NOT STARTED; COST_MEASURED = false; finalScaleReady = false)

## Objective

Implement a safe, dry-run cost evidence intake validator and local operator contract to evaluate candidate provider evidence deterministically before any database persistence:
1. **Operator Input Contract (Task 1):** Created `AGENT_CONTEXT/evidence/post-launch-20/pl20-03e-provider-cost-input.example.json` covering all four providers (`railway`, `supabase`, `stripe`, `resend`) with common fields, Railway allocation metadata (`allocation_model`, `account_total`, `shared_hosts`, `usage_metric`, `usage_values`, `allocation_formula`, `operator_approved_equal_allocation`), Stripe fields (`refund_dispute_treatment`, `gross_volume`), and Supabase/Resend free-tier provenance.
2. **Dry-Run Validator Utility (Tasks 2–9):** Created pure in-memory CLI/library `scripts/pl20/validate-cost-evidence.mjs` enforcing:
   - Identical common accounting period matching across all 4 providers (`period_match`).
   - Railway allocation models (`shared_unallocated` -> `PARTIAL`, `equal_allocation` -> `MEASURED` only with explicit operator approval flag, `resource_based` -> `MEASURED` only with full peer usage values and formula).
   - Stripe actual fee export requirement (`source_type: "provider_export"` / `"provider_billing"`); fee schedule alone returns `PARTIAL` with `amount = null`.
   - Supabase & Resend free-tier zero-cost provenance (`amount = 0` requires `tier = "free"`, `source_type`, `provided_by`, `measured_at`, `evidence_reference`, `caveats`).
   - Total derivation: `cost_total_state = "MEASURED"` and `isCostEvidenceMeasured = true` occur ONLY when all 4 providers are `MEASURED` and `period_match: true`.
   - Machine-readable output with provider-by-provider states and blocking reasons; no score, no readiness promotion.
3. **Automated Unit Tests (Task 10):** Created `tests/pl20/cost-evidence-validator.test.ts` verifying all 15 required contract tests (15 passed, 0 failed; all 178 project tests passing).
4. **Non-Persistence Enforced (Task 11):** Zero database calls, zero mutations to `operating_cost_summaries`, zero API calls to Railway/Supabase/Stripe/Resend.
5. **State Invariants:** `COST_MEASURED = false`, `finalScaleReady = false`, `PL20-03` remains ACTIVE, `PL21` NOT STARTED.

## Files Modified / Created

- `AGENT_CONTEXT/evidence/post-launch-20/pl20-03e-provider-cost-input.example.json` (created)
- `scripts/pl20/validate-cost-evidence.mjs` (created)
- `tests/pl20/cost-evidence-validator.test.ts` (created)
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03e1-cost-evidence-validator.md` (created)
- `AGENT_CONTEXT/06_CURRENT_TASK.md` (updated)
- `AGENT_CONTEXT/07_HANDOFF.md` (updated)
- `AGENT_CONTEXT/08_LAST_VALIDATION.md` (updated)
- `AGENT_CONTEXT/13_CHANGELOG.md` (updated)

## Verification Summary

- Lint: PASS (`tsc --noEmit`)
- Tests: 178 passed across 5 test files (`vitest run`)
- Build: PASS (`vite build && esbuild server.ts`)
- Release Gate: PASS (`validate-release.ps1`)
- Git Check: Clean (`git diff --check`)
- `COST_MEASURED`: Strictly `false`
- `finalScaleReady`: Strictly `false`
