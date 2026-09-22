# POST-LAUNCH 20 (PL20-03M): Production Alignment & Live Verification Evidence

**Date:** 2026-09-21
**Phase State:** PL20-01..PL20-03L PASS / CLOSED; PL20-03 ACTIVE; PL20-03M EXECUTED / PRODUCTION ALIGNED; PL21 NOT STARTED
**Origin Commit:** `a404795edead62faab73447e0527b75f8efb00ad`
**Deployed Production SHA:** `a404795edead62faab73447e0527b75f8efb00ad`
**Production Target:**
- Public URL: `https://selfcaresinners.com`
- Railway Service: `heroic-solace / stable-ecomerce` (`262ce4a4-ea70-4b0a-886d-511eb13d5d27`)
- Supabase Production Project: `dporfgsbwsyqzmlnqrug`
- Authoritative Production Store: `Selfcare Sinners` (`25f3ff7a-ee2f-4d88-b67c-b1b6327855b6`)

---

## 1. Executive Summary

In response to the finding that the candidate multi-currency operating cost row was previously verified on isolated staging (`gecdtigvmsvsmhvnlarh` / synthetic store `11111111-1111-4111-8111-111111111111`), this phase executed the controlled production alignment workflow:
1. Committed and CI-validated the multi-currency contract implementation (`a404795edead62faab73447e0527b75f8efb00ad`).
2. Verified deployment to production Railway (`heroic-solace / stable-ecomerce`).
3. Confirmed live production runtime SHA matches `a404795edead62faab73447e0527b75f8efb00ad` at `https://selfcaresinners.com/api/health`.
4. Executed production preflight against Supabase `dporfgsbwsyqzmlnqrug` in `--dry-run` mode, identifying authoritative store `25f3ff7a-ee2f-4d88-b67c-b1b6327855b6` and preserving existing historical row `a178bd3d-0468-47bb-bec5-7585ddd5f367` (period `2026-09`).
5. Persisted accepted multi-currency evidence to production `operating_cost_summaries` under period `2026-08`, cost_key `monthly_operating_cost_baseline` (Row ID: `efcab8e9-458c-4bdf-8c56-39fa63db7522`).
6. Verified all 8 database assertions on the read-back production row (`COST_MEASURED = true`, `total_estimate = null`, zero synthetic FX conversion).
7. Re-evaluated live production final-scale summary via `GET https://selfcaresinners.com/api/admin/final-scale/summary`, proving `isCostEvidenceMeasured = true` live on production, and `finalScaleReady = false` strictly computed from real evidence (blocked by open security findings P0 SEC-001, P1 SEC-002..SEC-019).

---

## 2. Deployment & Runtime Verification (Task 5)

### CI Verification
- **Workflow:** `Selfcare Quality Gate` (Run ID: `35688301207`)
  - Commit: `a404795edead62faab73447e0527b75f8efb00ad`
  - Result: `COMPLETED / SUCCESS` (quality: PASS, e2e: PASS, aggregate: PASS)
- **Workflow:** `Selfcare Production Smoke` (Run ID: `35688420652`)
  - Trigger: `deployment_status`
  - Result: `COMPLETED / SUCCESS` (production-smoke: PASS)

### Production Runtime Health Probe
- **Command:** `GET https://selfcaresinners.com/api/health`
- **Output:**
```json
{
  "status": "ok",
  "service": "selfcare-sinners-web",
  "environment": "production",
  "version": "a404795edead62faab73447e0527b75f8efb00ad",
  "uptimeSeconds": 714,
  "timestamp": "2026-09-22T05:01:37.782Z",
  "requestId": "f7bcb85d-e3e3-49c3-b269-573550af2dc3"
}
```
- **Verification:** Deployed production version matches exact implementation commit `a404795edead62faab73447e0527b75f8efb00ad`.

---

## 3. Production Persistence Preflight (Task 6)

- **Execution:** `node scripts/pl20/run-production-persist.mjs --dry-run --store-id 25f3ff7a-ee2f-4d88-b67c-b1b6327855b6 AGENT_CONTEXT/evidence/post-launch-20/pl20-03l-multi-currency-cost-intake.json`
- **Supabase Target:** `dporfgsbwsyqzmlnqrug` (verified in memory via Railway production environment)
- **Target Store:** `Selfcare Sinners (25f3ff7a-ee2f-4d88-b67c-b1b6327855b6)`
- **Pre-existing DB Rows:**
  - `a178bd3d-0468-47bb-bec5-7585ddd5f367` | Store: `25f3ff7a-ee2f-4d88-b67c-b1b6327855b6` | Period: `2026-09` | Key: `monthly_operating_cost_baseline` | Total: `0 USD` (Historical unmeasured baseline preserved untouched)
- **Preflight Outcome:** `PASS` (`--dry-run` exited without modifying database).

---

## 4. Production Database Persistence (Task 7)

- **Execution:** `node scripts/pl20/run-production-persist.mjs --store-id 25f3ff7a-ee2f-4d88-b67c-b1b6327855b6 AGENT_CONTEXT/evidence/post-launch-20/pl20-03l-multi-currency-cost-intake.json`
- **Database Table:** `operating_cost_summaries`
- **Persisted Row ID:** `efcab8e9-458c-4bdf-8c56-39fa63db7522`
- **Store ID:** `25f3ff7a-ee2f-4d88-b67c-b1b6327855b6`
- **Period:** `2026-08`
- **Cost Key:** `monthly_operating_cost_baseline`
- **Database Column `total_estimate`:** `null` (strictly null; zero numeric addition of mixed currencies)

---

## 5. Production Read-Back & Assertion Verification (Task 8)

| Item / Field | Production Value | Contract Status |
|---|---|---|
| **Row ID** | `efcab8e9-458c-4bdf-8c56-39fa63db7522` | Persisted & Verified |
| **Store ID** | `25f3ff7a-ee2f-4d88-b67c-b1b6327855b6` | Authoritative Production Store |
| **Period** | `2026-08` | Common Period `2026-08-09T20:56:36Z` through `2026-09-09T20:56:36Z` |
| **`total_estimate` (DB column)** | `null` | PASS: Not fabricated (not 0, not 7.96, not 9.2174) |
| **`metadata.cost_total_state`** | `MEASURED_MULTI_CURRENCY` | PASS |
| **`metadata.single_currency_total`** | `null` | PASS |
| **`metadata.single_currency_total_state`** | `NOT_COMPUTED_MULTI_CURRENCY` | PASS |
| **`metadata.is_cost_evidence_measured`** | `true` | PASS |
| **`metadata.measured_state`** | `MEASURED` | PASS |
| **Railway** | `1.2574 USD` — `MEASURED` | PASS (`provider_direct_billing_share`) |
| **Supabase** | `0.00 MXN` — `MEASURED` | PASS (`direct_attributed`) |
| **Stripe** | `7.96 MXN` — `MEASURED` | PASS (`direct_metered`) |
| **Resend** | `0.00 MXN` — `MEASURED` | PASS (`direct_attributed`) |
| **Multi-Currency Subtotals** | `USD: 1.2574`, `MXN: 7.96` | Complete & Non-estimated |

All 8 assertions passed with exit code 0.

---

## 6. Live Production Final Scale Re-Evaluation

Queried endpoint: `GET https://selfcaresinners.com/api/admin/final-scale/summary` via authorized admin token signed with production secret.

### Live Production Response Summary:
```json
{
  "status": "ok",
  "summary": {
    "reports": 0,
    "technicalAssessments": 0,
    "commercialAssessments": 0,
    "risks": 0,
    "technicalDebtItems": 0,
    "operatingCostSummaries": 1,
    "capacityAssessments": 0,
    "roadmapItems": 0,
    "scaleDecisions": 0,
    "investorChecks": 0,
    "historicalBaselineRows": 26,
    "technicalScore": null,
    "commercialScore": null,
    "capacityScore": null,
    "investorReadinessScore": null,
    "roadmapClosedThrough": "POST-LAUNCH 19 (QA / RELEASE E CLOSED)",
    "finalScaleReady": false,
    "evaluationRules": {
      "hasTechnicalEvidence": false,
      "technicalEvidenceComplete": false,
      "technicalEvidenceCurrent": false,
      "technicalRequiredPass": false,
      "isSecurityBlockersSatisfied": false,
      "currentCommitSha": "a404795edead62faab73447e0527b75f8efb00ad",
      "hasCriticalTechnicalFailure": false,
      "hasCriticalRisk": false,
      "hasCriticalDebt": false,
      "isCommercialMeasured": false,
      "isCostEvidenceMeasured": true,
      "CAPACITY_BASELINE_MEASURED": false,
      "CAPACITY_SCALE_MEASURED": false,
      "isCapacityLoadMeasured": false,
      "finalScaleReady": false
    }
  }
}
```

### Readiness Evaluation Breakdown:
- **`isCostEvidenceMeasured`:** **`true`** (Authoritative production cost evidence is recognized and validated live).
- **`operatingCostSummaries`:** `1` active measured row evaluated (`historicalBaselineRows: 26` filtered out from active score without error).
- **`technicalRequiredPass`:** `false` (Blocked by open security findings P0 SEC-001 and P1 SEC-002..SEC-019).
- **`finalScaleReady`:** **`false`** (Strictly derived; not forced).
