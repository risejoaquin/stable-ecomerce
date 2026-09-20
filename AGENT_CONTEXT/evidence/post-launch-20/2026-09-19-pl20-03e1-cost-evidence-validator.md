# POST-LAUNCH 20 (PL20-03E1): Cost Evidence Intake Validator

**Date:** 2026-09-19
**Mode:** READ-ONLY / DRY-RUN VALIDATION
**Evaluated Main Commit:** `9ec3d0fc14367288d9551c9c8d3da4abac686487`
**Phase State:** PL20-01 PASS / CLOSED; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03B PASS / CLOSED; PL20-03C PASS / CLOSED; PL20-03D PASS / CLOSED; PL20-03 ACTIVE; PL20-03E1 COMPLETE; PL21 NOT STARTED
**`COST_MEASURED`:** Strictly `false` (dry-run validator only; zero persistence)
**`finalScaleReady`:** Strictly `false`
**Result:** `READY_FOR_CHATGPT_WEB_VALIDATION`

---

## 1. Objective & Scope

In phase **PL20-03E1**, a pure in-memory, dry-run cost evidence intake validator and local operator contract were designed and implemented to evaluate actual provider cost evidence deterministically before any database persistence.

### Strict Safety & Evidence Integrity Guarantees
1. **Zero Database Mutations:** Does NOT call `POST /api/admin/final-scale/operating-costs/run` and does NOT create or update rows in `operating_cost_summaries`.
2. **Zero API / Network Calls:** Pure synchronous in-memory validator; never calls Railway, Supabase, Stripe, or Resend billing APIs.
3. **No Automatic Inferences:** Does not invent provider pricing, does not automatically divide Railway shared costs by four, and does not calculate actual Stripe fees from the fee schedule.
4. **`COST_MEASURED`:** Remains strictly `false`.
5. **`finalScaleReady`:** Remains strictly `false`.

---

## 2. Operator Evidence Input Contract (Task 1)

**Contract Path:** `AGENT_CONTEXT/evidence/post-launch-20/pl20-03e-provider-cost-input.example.json`

The input format supports all four providers:
- `railway`
- `supabase`
- `stripe`
- `resend`

### Required Common Schema Fields
- `provider`: Provider identifier (`"railway"` | `"supabase"` | `"stripe"` | `"resend"`)
- `amount`: Attributable numeric cost (or `0` for verified free tier; `null` for unallocated/unknown)
- `currency`: String (`"MXN"`)
- `period_start`: String (`YYYY-MM-DD`)
- `period_end`: String (`YYYY-MM-DD`)
- `actual_or_estimated`: String (`"actual"` | `"estimated"`)
- `source_type`: String (e.g. `"provider_export"`, `"provider_billing"`, `"operator_approved_equal_allocation"`, `"provider_plan_or_operator_attested_free_tier"`)
- `provided_by`: String (`"joaquin_operator"`)
- `measured_at`: ISO 8601 timestamp string
- `evidence_reference`: String path or reference to export/screenshot/attestation
- `caveats`: Array of explanatory strings

### Provider-Specific Fields
- **Railway:**
  - `allocation_model`: `"resource_based"` | `"equal_allocation"` | `"shared_unallocated"`
  - `account_total`: Positive numeric total billed for shared account
  - `shared_hosts`: Integer count of shared services/hosts (e.g. `4`)
  - `operator_approved_equal_allocation`: Boolean (mandatory `true` for equal allocation)
  - `usage_metric`: String (mandatory for resource-based)
  - `usage_values`: Object mapping hosts to usage numbers (mandatory for resource-based)
  - `allocation_formula`: String formula description
- **Stripe:**
  - `refund_dispute_treatment`: Mandatory string (`"included"` | `"excluded"` | `"none_observed"`)
  - `gross_volume`: Optional numeric gross transaction volume
- **Supabase & Resend:**
  - `plan` or `tier`: String (must be `"free"` for zero-cost validation)

---

## 3. Dry-Run Validator Utility (Tasks 2–9)

**Utility Path:** `scripts/pl20/validate-cost-evidence.mjs`

### Execution
```powershell
node scripts/pl20/validate-cost-evidence.mjs [path-to-input.json]
```
If no file argument is provided, defaults to `AGENT_CONTEXT/evidence/post-launch-20/pl20-03e-provider-cost-input.example.json`.

### Validation Rules Enforced
1. **Common Period Rule (Task 3):**
   - All four providers must cover the exact same `period_start` and `period_end`.
   - If any provider period differs: `period_match: false`, `cost_total_state: "PARTIAL"`, `isCostEvidenceMeasured: false`.
2. **Railway Allocation Rules (Task 4):**
   - `shared_unallocated`: Always `PARTIAL`, attributable `amount = null`.
   - `equal_allocation`: `MEASURED` only when `operator_approved_equal_allocation: true`, `account_total > 0`, `shared_hosts >= 1`, valid attributable `amount`, evidence reference, and timestamp exist. Without explicit operator approval flag, returns `PARTIAL`.
   - `resource_based`: `MEASURED` only when `usage_metric`, complete `usage_values` covering all shared hosts, `allocation_formula`, attributable `amount`, evidence reference, and timestamp exist.
3. **Stripe Rules (Task 5):**
   - `MEASURED` only when actual period fee total (`amount >= 0`, not null) is provided from `provider_export` or `provider_billing`, accompanied by `evidence_reference`, `measured_at`, and `refund_dispute_treatment`.
   - Fee schedule alone (`~2.9% + conditional 6 MXN` or `source_type: "fee_schedule_only"`): Returns `PARTIAL`, `amount = null`.
4. **Supabase Zero-Cost Rule (Task 6):**
   - `amount = 0` is valid only with explicit same-period free-tier provenance: `tier = "free"`, `source_type`, `provided_by`, `measured_at`, `evidence_reference`, and `caveats`. Missing provenance returns `PARTIAL`.
5. **Resend Zero-Cost Rule (Task 7):**
   - `amount = 0` requires explicit same-period free-tier provenance identical to Supabase. Missing provenance returns `PARTIAL`.
6. **Total Derivation (Task 8):**
   - `cost_total_state = "MEASURED"` and `isCostEvidenceMeasured = true` occur **ONLY** when:
     `Railway MEASURED AND Supabase MEASURED AND Stripe MEASURED AND Resend MEASURED AND period_match = true`.
   - Any single `PARTIAL` or mismatched provider forces `cost_total_state = "PARTIAL"` and `isCostEvidenceMeasured = false`.
7. **Machine-Readable Output (Task 9):**
   - Returns structured JSON containing `period`, `providers`, `cost_total_state`, `isCostEvidenceMeasured`, and `blocking_reasons`.
   - No score, no readiness promotion, no database side effects.

---

## 4. Test Suite Verification (Task 10)

**Test Path:** `tests/pl20/cost-evidence-validator.test.ts`

15 automated unit tests executed via Vitest, verifying all mandatory contract requirements:
1. `four empty records => NOT_MEASURED` (`isCostEvidenceMeasured: false`)
2. `mixed periods => PARTIAL` (`period_match: false`, `isCostEvidenceMeasured: false`)
3. `Railway shared_unallocated => PARTIAL` (`amount: null`)
4. `Railway equal allocation without approval => PARTIAL`
5. `Railway equal allocation with complete approval/evidence => MEASURED` (`amount: 48`)
6. `Railway resource-based incomplete => PARTIAL`
7. `Stripe fee schedule only => PARTIAL` (`amount: null`)
8. `Stripe actual fee export complete => MEASURED` (`amount: 142.50`)
9. `Supabase 0 without provenance => not MEASURED (PARTIAL)`
10. `Supabase free-tier complete => MEASURED` (`amount: 0`)
11. `Resend 0 without provenance => not MEASURED (PARTIAL)`
12. `Resend free-tier complete => MEASURED` (`amount: 0`)
13. `3 measured + 1 partial => total PARTIAL` (`isCostEvidenceMeasured: false`)
14. `all four measured same period => total MEASURED` (`isCostEvidenceMeasured: true`)
15. `no provider/API/database side effects` (verified fetch is never called and input data is not mutated)

**Test Result:** 15 passed (15), 0 failed.

---

## 5. Non-Persistence Affirmation (Task 11)

- No calls were made to `POST /api/admin/final-scale/operating-costs/run`.
- No records were created or modified in `operating_cost_summaries`.
- Production cost state remains `COST_MEASURED = false`.
- Readiness state remains `finalScaleReady = false`.
