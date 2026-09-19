# EVIDENCE: PL20-03A Cost Aggregation Hotfix: Attributable Cost Total Semantics

**Timestamp:** 2026-09-19T12:36:00-07:00  
**Phase:** POST-LAUNCH 20  
**Task ID:** PL20-03A-COST-AGGREGATION-HOTFIX  
**Target Commit:** Pending commit on `main`  
**Base Commit:** `64696209a26efec83ae1ae7c3c3800801fa3d8ef`  
**Status:** `READY_FOR_CHATGPT_WEB_VALIDATION`  
**State Constraints:**
- PL20-01: PASS / CLOSED
- PL20-02: PASS / CLOSED
- PL20-03: ACTIVE (DO NOT CLOSE PL20-03)
- PL21: NOT STARTED (DO NOT START PL21)
- `finalScaleReady`: strictly `false`

---

## 1. Executive Summary & Objective

In the initial implementation of PL20-03, Railway's monthly account cost of 192 MXN across 4 hosts was classified as `shared_unallocated` and `PARTIAL`, yet its raw account amount (192 MXN) was placed into the provider's `amount` field and subsequently summed into `total_estimate`. This created a semantic defect where shared/unallocated infrastructure costs were presented as ecommerce-attributable total operating cost.

This hotfix resolves attributable cost total semantics:
1. **Shared Account Cost Separation:** Railway account total (192 MXN across 4 hosts) is preserved as shared infrastructure evidence in metadata (`shared_account_costs`, `shared_unallocated_amounts`), while its ecommerce-attributable `amount` is explicitly `null`.
2. **Attributable Provider Cost Semantics:** Shared unallocated costs are not divided arbitrarily by 4 (to 48 MXN) nor summed into attributable totals.
3. **`measured_provider_total`:** Strictly sums only providers whose `measured_state === 'MEASURED'` with a non-null numeric amount.
4. **`total_estimate` Semantics:** Set to `measured_provider_total` ONLY when all four core providers (Railway, Supabase, Stripe, Resend) are `MEASURED`. If any provider is `PARTIAL` or unallocated, `total_estimate` evaluates strictly to `null`.
5. **Inclusive Calendar Month Period Bounds:** Computed via `getMonthPeriodBounds(periodStr)`, ensuring valid calendar start and end dates (`YYYY-MM-01` to `YYYY-MM-28/29/30/31`).
6. **Resend Caveat Clean-up:** Removed hardcoded `"up to 3,000 emails/month"` volume claim.

---

## 2. Architectural Semantics & Implementation Details

### 2.1 Shared Account Cost Separation vs Attributable Cost
- **Railway Infrastructure:**
  - Account total: 192 MXN/month.
  - Scope: Shared across 4 hosts (`shared_hosts: 4`).
  - Allocation Model: `shared_unallocated`.
  - Measured State: `PARTIAL`.
  - Attributable Amount: `null` (cannot be attributed until an empirical host allocation model is established).
  - Metadata breakdown:
    ```json
    {
      "shared_account_costs": { "railway": 192 },
      "shared_unallocated_amounts": { "railway": 192 },
      "unallocated_providers": ["railway"],
      "partial_provider_amounts": { "railway": 192 },
      "partial_known_amounts": { "railway": 192 },
      "unknown_amount_providers": ["railway", "stripe"]
    }
    ```

### 2.2 Provider State & Attributable Cost Summary

| Provider | Measured State | Attributable Amount | Allocation Model | Evidence / Provenance |
|---|---|---|---|---|
| **Railway** | `PARTIAL` | `null` | `shared_unallocated` | Shared 192 MXN across 4 hosts; unallocated |
| **Supabase** | `MEASURED` | `0` MXN | `dedicated_ecommerce` | Free tier attestation & provenance |
| **Stripe** | `PARTIAL` | `null` | `dedicated_ecommerce` | ~2.9% fee schedule; monthly export missing |
| **Resend** | `MEASURED` | `0` MXN | `dedicated_ecommerce` | Free tier baseline (0 MXN baseline cost) |

### 2.3 `measured_provider_total` Calculation Rule
`measured_provider_total` strictly aggregates providers satisfying:
- `measured_state === 'MEASURED'`
- `typeof amount === 'number'` and `!isNaN(amount)`

Providers in `PARTIAL` (such as Railway or Stripe) contribute `0` to `measured_provider_total`, yielding `0` MXN attributable total from verified measured providers (Supabase 0 + Resend 0).

### 2.4 `total_estimate` Rule
- `total_estimate = measured_provider_total` **if and only if** all four providers have `measured_state === 'MEASURED'`.
- If one or more providers have `measured_state !== 'MEASURED'`, `total_estimate = null`.
- This ensures downstream consumers, APIs, and administrators never interpret incomplete or partial figures as the actual total operating cost of the ecommerce store.

### 2.5 Calendar Month Period Boundary Convention
Implemented `getMonthPeriodBounds(periodStr)`:
- Parses `YYYY-MM`.
- Start date: `YYYY-MM-01`.
- End date: `YYYY-MM-<lastDay>`, dynamically computing leap years for February (29 days vs 28 days) and month lengths (30 vs 31 days).
- Guarantees valid ISO 8601 calendar date intervals for all provider records and summary records.

---

## 3. Contract & Regression Testing Verification

Added comprehensive test coverage in `tests/api/functional-quality-contracts.test.ts` (Tests 1 through 17):
1. Test 1: `shared_account_costs.railway === 192`.
2. Test 2: Railway attributable `amount === null`.
3. Test 3: Railway allocation model is `'shared_unallocated'`.
4. Test 4: Railway measured state is `'PARTIAL'`.
5. Test 5: `measured_provider_total === 0` when only Supabase and Resend are MEASURED.
6. Test 6: `total_estimate === null` when any provider is PARTIAL or unallocated.
7. Test 7: `unallocated_providers` contains `'railway'`.
8. Test 8: `unknown_amount_providers` includes unallocated/null providers.
9. Test 9: `shared_unallocated_amounts.railway === 192`.
10. Test 10: `partial_provider_amounts.railway === 192`.
11. Test 11: Valid month start and end dates (`YYYY-MM-01` and last calendar day).
12. Test 12: Resend caveat does not claim `"up to 3,000 emails/month"`.
13. Test 13: `total_estimate` is numeric ONLY when all four providers are MEASURED.
14. Test 14: `finalScaleReady` evaluates strictly to `false`.
15. Tests 15-17: Comprehensive edge cases and consistency checks.

---

## 4. Verification Evidence

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (122/122 tests passed across 4 files, 105 in `functional-quality-contracts.test.ts`)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `npm run qa:release` (`.\scripts\qa\validate-release.ps1`): FINAL RESULT PASS (8/8 gates passed)
- `git diff --check`: PASS (0 whitespace errors)
