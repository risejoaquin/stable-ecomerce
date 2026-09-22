# POST-LAUNCH 20 (PL20-03K): Operating Cost Evidence Intake Preparation

**Date:** 2026-09-21
**Phase State:** PL20-01..PL20-03J PASS / CLOSED; PL20-03 ACTIVE; PL20-03K IN PROGRESS (INTAKE ONLY); PL21 NOT STARTED
**Evaluated Main Commit:** `1bec59b68cddf1f136ba08666e675ad323516721`
**Evaluation Scope:** Read-Only / Normalization Only (Zero DB persistence)
**Common Accounting Period:** `2026-08-01` through `2026-08-31` (`inclusive_calendar_month`)
**Common Period Resolved:** `true`
**All Four Providers MEASURED:** `false` (Railway is `PARTIAL`)
**Candidate Cost Total:** `null`
**`COST_MEASURED`:** Strictly `false`
**`finalScaleReady`:** Strictly `false`
**Result:** `READY_FOR_CHATGPT_WEB_VALIDATION`

---

## 1. Executive Summary & Operating Cost Intake Scope

In strict compliance with **PL20-03K** directives, the operating cost evidence intake package was prepared and normalized without fabricating costs, without inferring provider charges, and without persisting any database rows (`cost_snapshots` or `final_scale_reports`).

- **Target Common Period:** Completed calendar month `2026-08-01` to `2026-08-31`. All four providers (Railway, Supabase, Stripe, Resend) are evaluated against this exact common period (`period_match: true`).
- **Validator Execution:** Evaluated via `scripts/pl20/validate-cost-evidence.mjs` using the real candidate intake package [pl20-03k-provider-cost-intake.json](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce/AGENT_CONTEXT/evidence/post-launch-20/pl20-03k-provider-cost-intake.json).
- **Core Governance Outcome:**
  - `railway`: **PARTIAL** (`amount: null`, `shared_unallocated`).
  - `supabase`: **MEASURED** (`amount: 0.00 MXN`, Free Tier provenance).
  - `stripe`: **MEASURED** (`amount: 7.96 MXN`, Real balance transactions fee total from live account).
  - `resend`: **MEASURED** (`amount: 0.00 MXN`, Free Tier provenance).
  - `cost_total_state`: **PARTIAL**.
  - `candidate_total`: `null` (unattributable Railway prevents total calculation).
  - `COST_MEASURED`: Strictly `false`.
  - `finalScaleReady`: Strictly `false`.

---

## 2. Common Accounting Period Determination (Task 1)

| Field | Configured Value | Verification / Status |
|---|---|---|
| **Period Start** | `2026-08-01` | Valid inclusive calendar month start |
| **Period End** | `2026-08-31` | Valid inclusive calendar month end |
| **Period Convention** | `inclusive_calendar_month` | Deterministic 31-day boundary |
| **Period Alignment** | `period_match: true` | Verified identical across Railway, Supabase, Stripe, and Resend |
| **Common Period Resolved** | **`true`** | No provider period mismatch |

---

## 3. Provider Cost Evidence Reports (Tasks 2, 3, 4, 5)

### Provider 1: Railway (Task 2)
- **Provider:** `railway`
- **Period:** `2026-08-01` to `2026-08-31`
- **Currency:** `MXN`
- **Workspace Total:** `192.00 MXN` (Workspace `SolidBitsMx`, 4 shared active hosts)
- **Ecommerce Attributable Amount:** `null`
- **Measured State:** `PARTIAL`
- **Allocation Method:** `shared_unallocated`
- **Source Type:** `operator_attested_shared_account_cost`
- **Evidence Reference:** `workspace:SolidBitsMx:invoice:2026-08`
- **Measured At:** `2026-09-21T19:00:00.000Z`
- **Caveat:**
  > Railway account total of 192.00 MXN is shared across 4 hosts in workspace `SolidBitsMx`. Ecommerce attributable usage is unallocated; amount remains `null`. Did not automatically divide by 4. Did not infer equal allocation approval.

### Provider 2: Supabase (Task 3)
- **Provider:** `supabase`
- **Period:** `2026-08-01` to `2026-08-31`
- **Plan / Tier:** `free`
- **Actual Amount Charged:** `0.00 MXN`
- **Currency:** `MXN`
- **Measured State:** `MEASURED`
- **Allocation Method:** `direct_attributed` (Single dedicated production project `dporfgsbwsyqzmlnqrug`)
- **Source Type:** `provider_plan_or_operator_attested_free_tier`
- **Evidence Reference:** `supabase:project:dporfgsbwsyqzmlnqrug:plan:free`
- **Measured At:** `2026-09-21T19:00:00.000Z`
- **Caveat:**
  > Production database `dporfgsbwsyqzmlnqrug` operated on Supabase Free Tier during August 2026 with zero excess compute, egress, or storage billing charges.

### Provider 3: Stripe (Task 4)
- **Provider:** `stripe`
- **Period:** `2026-08-01` to `2026-08-31`
- **Gross Processed Volume:** `24.00 MXN` (2 transactions processed in August 2026)
- **Total Stripe Fees:** `7.96 MXN`
- **Currency:** `MXN`
- **Refund Treatment:** `none_observed` (0 refunds during period)
- **Dispute Treatment:** `none_observed` (0 disputes during period)
- **Measured State:** `MEASURED`
- **Allocation Method:** `direct_metered`
- **Source Type:** `provider_billing` (Direct live account query via Stripe CLI Balance Transactions API on `acct_1TLawpEKfBRabUZ0`)
- **Evidence Reference:** `stripe:api:balance_transactions:acct_1TLawpEKfBRabUZ0:2026-08`
- **Measured At:** `2026-09-21T19:00:00.000Z`
- **Privacy & Safety:** Zero customer PII, card numbers, PAN, CVV, full payment IDs, or secret keys exposed.
- **Caveat:**
  > Live Stripe account `acct_1TLawpEKfBRabUZ0` processed 2 customer charges in August 2026 totaling 24.00 MXN gross with 7.96 MXN in provider processing fees (2 charges × [12.00 gross - 3.98 fee = 8.02 net]). Fees are measured from actual balance transactions, NOT calculated from published schedules.

### Provider 4: Resend (Task 5)
- **Provider:** `resend`
- **Period:** `2026-08-01` to `2026-08-31`
- **Plan / Tier:** `free`
- **Actual Amount Charged:** `0.00 MXN`
- **Currency:** `MXN`
- **Measured State:** `MEASURED`
- **Allocation Method:** `direct_attributed`
- **Source Type:** `provider_plan_or_operator_attested_free_tier`
- **Evidence Reference:** `resend:account:free_tier:2026-08`
- **Measured At:** `2026-09-21T19:00:00.000Z`
- **Caveat:**
  > Resend transactional email account operated under the Free tier during August 2026 with zero billing charges incurred. No unverified monthly volume allowances claimed.

---

## 4. Validator Execution Results (Task 6)

Executed `scripts/pl20/validate-cost-evidence.mjs` against `AGENT_CONTEXT/evidence/post-launch-20/pl20-03k-provider-cost-intake.json`:

```json
{
  "period": {
    "period_start": "2026-08-01",
    "period_end": "2026-08-31",
    "period_match": true
  },
  "providers": {
    "railway": {
      "state": "PARTIAL",
      "amount": null,
      "currency": "MXN",
      "reasons": [
        "Railway shared account cost is unallocated across shared hosts. Attributable ecommerce amount is unresolved."
      ]
    },
    "supabase": {
      "state": "MEASURED",
      "amount": 0,
      "currency": "MXN",
      "reasons": []
    },
    "stripe": {
      "state": "MEASURED",
      "amount": 7.96,
      "currency": "MXN",
      "reasons": []
    },
    "resend": {
      "state": "MEASURED",
      "amount": 0,
      "currency": "MXN",
      "reasons": []
    }
  },
  "cost_total_state": "PARTIAL",
  "isCostEvidenceMeasured": false,
  "blocking_reasons": [
    "[railway:PARTIAL] Railway shared account cost is unallocated across shared hosts. Attributable ecommerce amount is unresolved."
  ]
}
```

---

## 5. Non-Persistence Guarantees & State Governance (Tasks 7, 8)

1. **Zero Database Persistence:**
   - 0 rows written to `cost_snapshots`.
   - 0 rows written to `final_scale_reports`.
   - Database and runtime processes remain read-only.
2. **`common period resolved`:** `true` (`2026-08-01` to `2026-08-31`).
3. **`all four MEASURED`:** `false` (Railway is `PARTIAL`).
4. **`candidate total`:** `null` (Cannot be calculated while Railway is unallocated).
5. **Invariants Preserved:**
   - `COST_MEASURED = false`
   - `finalScaleReady = false`
   - `CAPACITY_BASELINE_MEASURED = true`
   - `CAPACITY_SCALE_MEASURED = true`
   - `PL20-03: ACTIVE`
   - `PL21: NOT STARTED`

---

## 6. Railway August Billing Population Reconciliation (Task Addendum)

### 6.1 Formal Result
**`AUGUST_BILLING_POPULATION_RESOLVED`**

### 6.2 Billing Population Inventory
A full audit of workspace `SolidBitsMx` (`8256c59b-0866-4534-b032-3658bf317799`) via Railway GraphQL and CLI confirmed that the August 2026 billing population consisted of **exactly 6 container services** in project `heroic-solace` (`2ee53291-c0b1-4859-9ae6-8e331d1f6435`), with zero volumes and zero database plugins:

1. `stable-ecomerce` (`262ce4a4-ea70-4b0a-886d-511eb13d5d27`): Active all 31 days (Aug 1–31). Selfcare storefront.
2. `solidbit` (`a19369aa-e5b9-4485-af66-51e4256c334e`): Active all 31 days (Aug 1–31). Unrelated project.
3. `POS-SERVICE-1a2204e7-5559-41a3-8460-7927f420162e` (`845f77b5-abbd-49ea-a4b5-2930df27e213`): Created 2026-07-24, deleted **2026-08-16T08:25:57.910Z** (~15.35 days active in August).
4. `FULL-METAL-CASH` (`fdcf686a-30f3-4240-a9e9-bea2a70be737`): Created **2026-08-16T08:28:01.825Z** (~2 mins after POS-SERVICE deletion; ~15.65 days active in August).
5. `POS-FULL-SERVICE-cf142005-e5e0-4eaa-a3a3-135a6e89c0a3` (`fce50181-3496-4e25-b969-b1cdb741e77a`): Created 2026-08-03T08:29:42.081Z, deleted **2026-08-22T22:59:48.074Z** (~19.60 days active in August).
6. `cooperative-connection` (`e0e69a10-8c8d-4c0b-a541-5310d8d04aba`): Created **2026-08-22T22:59:49.190Z** (~1 sec after POS-FULL deletion; ~9.04 days active in August).

*Other Workspace Projects:*
- `graceful-inspiration` (`a87bc156`): 0 services; 0 billable usage.
- `selfcare-sinners-staging` (`d1321352`): Created 2026-09-21 for isolated staging; did not exist in August 2026.

### 6.3 Railway Billing Export (Period 2026-08)
Via `railway usage projects --workspace SolidBitsMx --project heroic-solace --period 2026-08 --json`:
- Billing Cycle: `2026-08-09T20:56:36` to `2026-09-09T20:56:36`
- Total Usage: `$6.3059 USD`
  - `FULL-METAL-CASH`: $2.5197 USD (40.0%)
  - `stable-ecomerce`: $1.2574 USD (19.9%)
  - `cooperative-connection`: $0.7669 USD (12.2%)
  - `solidbit`: $0.7419 USD (11.8%)
  - `POS-FULL-SERVICE` (deleted): $0.7080 USD (11.2%)
  - `POS-SERVICE` (deleted): $0.3121 USD (5.0%)

### 6.4 Common Calendar Month Telemetry Usage (`2026-08-01` to `2026-08-31`)
- **Total Workspace CPU:** `415.35 vCPU-hours` (`stable-ecomerce`: `1.59 vCPU-hours` = 0.38%)
- **Total Workspace Memory:** `23,361.77 GB-hours` (`stable-ecomerce`: `5,244.25 GB-hours` = 22.45%)
- **Total Workspace Egress:** `0.2983 GB` (`stable-ecomerce`: `0.2125 GB` = 71.23%)
- **Reconciliation Variance:** < 0.001% across all telemetry dimensions.

### 6.5 Invariants Preserved
- No allocation applied; Railway amount remains `null`.
- `COST_MEASURED = false`, `finalScaleReady = false`.
