# POST-LAUNCH 20 (PL20-03L): Multi-Currency Operating Cost Evidence Candidate Package

**Date:** 2026-09-21
**Phase State:** PL20-01..PL20-03J PASS / CLOSED; PL20-03 ACTIVE; PL20-03L IN PROGRESS (CANDIDATE PACKAGE READY); PL21 NOT STARTED
**Evaluated Main Commit:** `1bec59b68cddf1f136ba08666e675ad323516721`
**Common Accounting Period:** `2026-08-09T20:56:36Z` through `2026-09-09T20:56:36Z`
**Contract Model:** `MEASURED_MULTI_CURRENCY`
**Persistence State:** Strictly 0 DB rows persisted (`cost_snapshots` and `final_scale_reports` untouched)
**Status:** `READY_FOR_CHATGPT_WEB_VALIDATION`

---

## 1. Multi-Currency Contract Decision & Rationale

Per directive from ChatGPT Web:
- A multi-currency measured-cost contract is adopted.
- `COST_MEASURED` does not require all providers to be synthesized into a single common currency via artificial or speculative FX conversions.
- Provider-native currencies are preserved exactly as billed/observed.
- Criteria satisfied:
  1. All 4 providers (`railway`, `supabase`, `stripe`, `resend`) have attributable measured cost evidence.
  2. The common accounting period (`2026-08-09T20:56:36Z` through `2026-09-09T20:56:36Z`) is 100% compatible across all 4 providers.
  3. Native currencies are preserved: Railway in `USD`; Supabase, Stripe, and Resend in `MXN`.
  4. Zero estimated FX conversions are introduced.
  5. Provenance is complete with zero placeholder values.

---

## 2. Common Accounting Period Compatibility

All four providers have affirmatively proven compatibility with the interval **`2026-08-09T20:56:36Z` to `2026-09-09T20:56:36Z`**:
- **Railway:** Exact billing cycle anchor natively reported by Railway CLI (`railway usage projects --workspace SolidBitsMx --project heroic-solace --period 2026-08 --json`).
- **Supabase:** Free Tier active continuously with zero usage charges.
- **Stripe:** Balance Transactions API query (`created[gte]=1786308996` and `created[lte]=1788987396`) confirms exactly 2 customer charges occurred on Aug 26 and Aug 31 with 7.96 MXN total fees.
- **Resend:** Free Tier active continuously with zero usage charges.

---

## 3. Provider Cost Evidence Matrix

| Provider | Amount | Currency | Measured State | Allocation Method | Source Type | Evidence Reference |
|---|---|---|---|---|---|---|
| **Railway** | **`1.2574`** | **`USD`** | **`MEASURED`** | `provider_direct_billing_share` | `provider_billing` | `railway:cli:usage:projects:heroic-solace:2026-08` |
| **Supabase** | **`0.00`** | **`MXN`** | **`MEASURED`** | `direct_attributed` | `provider_plan_or_operator_attested_free_tier` | `supabase:project:dporfgsbwsyqzmlnqrug:plan:free` |
| **Stripe** | **`7.96`** | **`MXN`** | **`MEASURED`** | `direct_metered` | `provider_billing` | `stripe:api:balance_transactions:acct_1TLawpEKfBRabUZ0:2026-08-09_2026-09-09` |
| **Resend** | **`0.00`** | **`MXN`** | **`MEASURED`** | `direct_attributed` | `provider_plan_or_operator_attested_free_tier` | `resend:account:free_tier:2026-08-09_2026-09-09` |

### Provider Specifics & Caveats
- **Railway:**
  - Workspace Total: `$6.3059 USD` across project `heroic-solace`.
  - Attributable Share: `1.2574 USD / 6.3059 USD = 0.1994005614` (19.94005614%).
  - Services in Population: 6 (stable-ecomerce, solidbit, FULL-METAL-CASH, cooperative-connection, and 2 deleted predecessor services).
  - Caveat: *"Railway cost is retained in provider-native USD because exact settlement conversion to operator-paid MXN is not proven."*
- **Supabase:**
  - Attributed Cost: `0.00 MXN`.
  - Caveat: *"Production database dporfgsbwsyqzmlnqrug operated continuously on Supabase Free Tier during the common accounting period with zero compute or storage overages."*
- **Stripe:**
  - Gross Volume: `24.00 MXN` across 2 successful charges.
  - Processing Fees: `7.96 MXN` (6.86 MXN base processing fee + 1.10 MXN VAT).
  - Refunds / Disputes: `0` refunds, `0` disputes.
  - Caveat: *"Live Stripe account acct_1TLawpEKfBRabUZ0 processed 2 charges in common period totaling 24.00 MXN gross with 7.96 MXN in provider processing fees (zero refunds, zero disputes)."`
- **Resend:**
  - Attributed Cost: `0.00 MXN`.
  - Caveat: *"Resend account operated continuously under free tier during common period with zero billing charges."*

---

## 4. Multi-Currency Totals Contract

- **`all_four_measured`:** `true`
- **`multi_currency`:** `true`
- **`USD subtotal`:** `1.2574 USD`
- **`MXN subtotal`:** `7.96 MXN`
- **`single_currency_total`:** `null`
- **`single_currency_total_state`:** `NOT_COMPUTED_MULTI_CURRENCY`
- **Overall State:** `MEASURED_MULTI_CURRENCY`

---

## 5. Governance & Invariants

- **Candidate `COST_MEASURED`:** `true`
- **Confirmed `finalScaleReady`:** `false`
- **Database Persistence:** Strictly `0` rows written to `cost_snapshots` or `final_scale_reports`.
- **Phase State:** `PL20-03: ACTIVE` | `PL21: NOT STARTED`
