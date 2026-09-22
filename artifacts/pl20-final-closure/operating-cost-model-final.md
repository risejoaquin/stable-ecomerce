# POST-LAUNCH 20 — DELIVERABLE 5
# Operating Cost Model (Final Baseline)

- **Date:** 2026-09-22
- **Validated Commit SHA:** `711d816b329dafbc8d05440029870174477b37a4`
- **Assessment Status:** **`isCostEvidenceMeasured = true`**
- **Database Table:** `operating_cost_summaries`
- **Total State:** **`MEASURED_MULTI_CURRENCY`**
- **Single Currency Total:** **`null`**
- **Single Currency Total State:** **`NOT_COMPUTED_MULTI_CURRENCY`**

---

## 1. Multi-Currency Operating Cost Baseline

The operating cost model reflects actual, verified infrastructure invoices and billing records across all third-party service providers. In accordance with PL20 financial integrity standards, **synthetic foreign exchange (FX) conversion has been strictly avoided**. Costs are recorded in their provider-native billing currencies to prevent distortion from currency fluctuations.

### Provider-Native Cost Breakdown:

| Provider | Service Role | Native Currency | Measured Billing Amount | Billing Model | Notes / Status |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Railway** | Web Application & API Hosting | **USD** | **`$1.2574`** | Usage-based (CPU / RAM) | Primary production Node container |
| **Supabase** | Managed PostgreSQL & Auth | **MXN** | **`$0.00`** | Free tier / Usage | Database storage < 500MB, < 50k MAU |
| **Stripe** | Payment Gateway Processing | **MXN** | **`$7.96`** | Per-transaction fee | Fees for 2 processed transactions |
| **Resend** | Transactional Email Service | **MXN** | **`$0.00`** | Free tier / Usage | Volume < 3,000 emails / month |

---

## 2. Multi-Currency Financial Governance

### Strict Architectural Principles:
1. **No Synthetic FX Conversion:**
   No arbitrary exchange rate (e.g., $1 USD = 19.50 MXN) is applied. Summing USD and MXN into a single artificial aggregate would introduce currency speculation into operational evidence.
2. **`single_currency_total: null`:**
   Single-currency total is intentionally `null` with status `NOT_COMPUTED_MULTI_CURRENCY`.
3. **`cost_total_state: MEASURED_MULTI_CURRENCY`:**
   Confirmed in production database row in `operating_cost_summaries`.

---

## 3. Cost Drivers & Elasticity Analysis

### Fixed vs. Variable Cost Structure:
- **Base Infrastructure Usage:**
  - Railway container measured usage: 1.2574 USD for the evaluated billing period.
  - Supabase database baseline: $0.00 MXN under free tier limits (<500MB storage, <50k MAU).
  - Resend email baseline: $0.00 MXN under free tier limits (<3,000 emails/month).
- **Variable Transactional Cost:**
  - Stripe gateway fees: 7.96 MXN total across 2 processed transactions in the evaluated sample.
  - Variable shipping / fulfillment costs: charged directly on order checkout.

---

## 4. Operational Non-Claims & Financial Caveats

> [!IMPORTANT]
> ### Crucial Operational Disclaimer:
> This cost assessment provides an **infrastructure operating cost baseline**.
> **It is NOT proof of financial viability, unit profitability, or positive cash flow.**
> - Profitability, sustainable margins, ROI, and cost coverage are **NOT MEASURED / NOT DETERMINABLE** from current low-volume evidence.
> - Customer acquisition costs (paid social, search ads, affiliate fees) are not included as external marketing channels are not yet spending.
> - Labor, legal, compliance, and ongoing development expenses are excluded from this technical infrastructure baseline.
