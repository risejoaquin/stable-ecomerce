# POST-LAUNCH 20 — PL20-03A: Real Operating Cost Snapshot & Measurement Infrastructure

**Date:** 2026-09-19  
**Phase:** POST-LAUNCH 20  
**Task ID:** PL20-03A-REAL-COST-SNAPSHOT-MEASUREMENT-INFRA  
**Base Commit:** `6a2b265bc29601c1f2143bf4b99a7a7b9e637e6d`  
**Status:** READY_FOR_CHATGPT_WEB_VALIDATION  
**Formal State:**  
- PL20-01: PASS  
- PL20-02: PASS / CLOSED  
- PL20-03: AUTHORIZED / ACTIVE  
- POST-LAUNCH 20: ACTIVE  
- PL21: NOT STARTED  
- finalScaleReady: EXPECTED FALSE  

---

## 1. Provider Cost States & Facts

The durable provider cost evidence contract establishes strict accounting across exactly four core infrastructure providers:

| Provider | Current Plan / Tier | Current Cost | Provenance Source | Classification / State | Allocation Model |
|---|---|---|---|---|---|
| **Railway** | Shared Account Infrastructure | 192 MXN / month | Operator attestation | `PARTIAL` | `shared_unallocated` |
| **Supabase** | Free Tier | 0 MXN | Operator attestation + Free Tier Plan | `MEASURED` (when provenance satisfied) | Single tenant (free tier) |
| **Stripe** | Standard Fee Schedule | Variable (~2.9% + cond. 6 MXN) | Fee structure estimate | `PARTIAL` | Transaction based |
| **Resend** | Free Tier | 0 MXN (up to 3,000 emails/mo) | Operator attestation + Free Tier Plan | `MEASURED` (when provenance satisfied) | Single tenant (free tier) |

---

## 2. Known vs. Unknown Facts

### Known Facts
1. **Railway:** Total current account/project infrastructure cost is 192 MXN/month, shared across 4 hosts.
2. **Supabase:** Active on Free Tier with 0 MXN recurring subscription cost.
3. **Stripe:** Fee schedule is approximately 2.9% per transaction, with conditional 6 MXN fixed fee in specific scenarios.
4. **Resend:** Active on Free Tier with 0 MXN monthly baseline cost for transactional emails.

### Unknown Facts
1. **Railway Ecommerce Allocation:** Specific resource consumption or host-level breakdown for the ecommerce application within the shared 4-host account is not yet isolated.
2. **Stripe Actual Target Period Total:** Total transaction fees deducted by Stripe for the target monthly period are unmeasured without ingesting a verified Stripe monthly balance/export report.

---

## 3. Railway Shared Allocation Rule (Task 6)

- Explicit `allocation_model` is supported: `shared_unallocated`, `resource_based`, and `equal_allocation`.
- Current value is strictly `shared_unallocated`.
- **Integrity Rule:** The server **does NOT automatically divide by 4** or record 48 MXN as actual cost. Doing so would constitute an unverified heuristic.
- Railway evidence strictly remains `PARTIAL` until explicit resource-based telemetry or dedicated host isolation is established.

---

## 4. Stripe Limitation & Contract (Task 7)

- Supported sources: `provider_export`, `provider_billing`, `user_supplied_actual`, and `transaction_calculation`.
- `transaction_calculation` qualifies as `MEASURED` only when:
  1. Percentage rule is exact.
  2. Fixed-fee applicability is exact.
  3. Period (`period_start`, `period_end`) is exact.
  4. Currency is exact (`MXN` or `USD`).
  5. Refund/dispute fee treatment is defined.
  6. Calculation version is recorded.
- Without an exact provider export or complete transaction calculation, Stripe evidence remains `PARTIAL`.

---

## 5. Zero-Cost Contract (Task 4)

- Zero is a valid cost amount only with explicit affirmative evidence explaining why.
- For Supabase and Resend, `amount = 0` requires:
  - `source_type` (non-manual)
  - `provided_by` (authenticated operator ID)
  - `period_start` and `period_end`
  - `measured_at`
  - `evidence_reference`
  - `caveats` explicitly stating free tier plan status
- Arbitrary input of `0` without free-tier provenance is rejected as `PARTIAL` / `NOT_MEASURED`.

---

## 6. Cost Total State Derivation (Task 5 & 8)

- **Total State Rule:**
  - All 4 providers `MEASURED` $\rightarrow$ `MEASURED`
  - One or more `PARTIAL` $\rightarrow$ `PARTIAL`
  - One or more `NOT_MEASURED` $\rightarrow$ `PARTIAL` (unless all 4 absent $\rightarrow$ `NOT_MEASURED`)
- **API Safety:** Merely submitting four numeric values into `POST /api/admin/final-scale/operating-costs/run` does NOT satisfy `MEASURED`. Numbers without provider provenance are classified as `MANUAL`/`PARTIAL`.
- `isCostEvidenceMeasured` in summary strictly requires all 4 providers to be `MEASURED`. Under current operational facts (Railway `PARTIAL`, Stripe `PARTIAL`), `isCostEvidenceMeasured = false`.

---

## 7. Capacity Status & k6 Preparation (Task 9 & 10)

- Capacity measurement infrastructure is established in `scripts/load/pl20-baseline.k6.js`.
- It enforces strict safety guards:
  - `BASE_URL`, `APPROVED_VUS`, `APPROVED_DURATION`, `APPROVED_SLEEP_SECONDS`, `PL20_ENVIRONMENT`, `PL20_STAGE` required.
  - Production target is locked unless `ALLOW_PRODUCTION_LOAD_TEST=true` is explicitly provided.
  - Route whitelist restricted to `SAFE_READ` routes only.
  - Zero execution performed against production.
- `CAPACITY_BASELINE_MEASURED = false`, `CAPACITY_SCALE_MEASURED = false`, and `isCapacityLoadMeasured = false`. Single-container Node memory RSS and database pool connectivity do not alter these flags.

---

## 8. Impact on Final Scale Readiness

- `technicalRequiredPass`: `false` (pending dedicated E2E runner)
- `isCostEvidenceMeasured`: `false` (Railway unallocated, Stripe actual unmeasured)
- `isCapacityLoadMeasured`: `false` (load test unexecuted)
- `finalScaleReady`: strictly evaluates to **`false`**.
