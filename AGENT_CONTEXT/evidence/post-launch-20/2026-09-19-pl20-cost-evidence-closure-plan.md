# POST-LAUNCH 20 - PL20 Cost Evidence Closure Plan

Date: 2026-09-19
Mode: READ-ONLY / ANALYSIS
Current main provided by ChatGPT Web: `4397742e7bcca890768f1c58ce8e68418a7f6ff6`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This document defines the minimum exact evidence still needed to turn `COST_MEASURED=true`.

No application code, tests, workflows, Supabase, Railway, Stripe, Resend, current-task, handoff, or validation files were modified.

Current known state:

| Provider | Current Fact | Current State | Blocking Gap |
|---|---|---|---|
| Railway | 192 MXN/month shared across 4 hosts | `PARTIAL` | Ecommerce allocation unresolved |
| Supabase | Current free tier, 0 MXN | `MEASURED` when provenance fields are complete | Period/provenance must remain explicit |
| Stripe | Approximately 2.9%; conditional 6 MXN | `PARTIAL` | Actual period fee total unresolved |
| Resend | Current free tier, 0 MXN | `MEASURED` when provenance fields are complete | Period/provenance must remain explicit |

`COST_MEASURED=true` requires all four providers to be `MEASURED` for the same accounting period. `PARTIAL` Railway or `PARTIAL` Stripe keeps `cost.total = PARTIAL` and `isCostEvidenceMeasured = false`.

## Part 1 - Railway

Railway currently has known shared account cost:

```text
192 MXN/month shared across 4 hosts
```

Do not divide by 4 automatically. ChatGPT Web/user must choose an allowed allocation method before Railway can become `MEASURED`.

### Method A - `resource_based`

Sufficient evidence:

- selected accounting period;
- Railway billing evidence showing total Railway amount for that period;
- list of the 4 shared hosts/services active in that same period;
- ecommerce service identifier or safe label;
- usage metric selected for allocation, such as runtime hours, memory-hours, CPU-hours, request share, or another Railway-supported metric;
- per-host/service usage values for all 4 hosts in the same unit;
- allocation formula;
- computed ecommerce allocation;
- currency;
- measured_at timestamp;
- evidence reference, such as dashboard screenshot/export filename or operator attestation file;
- caveat if the metric is a proxy rather than provider-native billing allocation.

Minimum Joaquín-provided evidence:

```text
Railway billing period: <YYYY-MM-01 to YYYY-MM-last-day>
Railway total amount: 192 MXN
Shared hosts count: 4
Ecommerce host/service label: <safe label, no internal secret>
Allocation metric: <runtime-hours|memory-hours|CPU-hours|requests|other>
Usage values:
  ecommerce: <number> <unit>
  host_2: <number> <unit>
  host_3: <number> <unit>
  host_4: <number> <unit>
Formula: ecommerce_usage / total_usage * 192 MXN
Evidence reference: <screenshot/export/attestation path>
Measured at: <ISO timestamp>
```

Result if complete:

```text
railway.measured_state = MEASURED
railway.allocation_model = resource_based
railway.amount = computed ecommerce allocation
railway.actual_or_estimated = actual if Railway usage/billing export; estimated if operator-calculated proxy
```

If usage values are incomplete or the metric is not approved:

```text
railway.measured_state = PARTIAL
```

### Method B - `equal_allocation`

Sufficient evidence:

- selected accounting period;
- Railway billing evidence showing 192 MXN total for the period;
- confirmation that exactly 4 active hosts share the account cost for that period;
- explicit ChatGPT Web/user approval to use equal allocation as an accounting method;
- computed allocation: `192 MXN / 4 = 48 MXN`;
- caveat that equal allocation is an approved accounting convention, not provider-measured ecommerce usage;
- measured_at timestamp;
- evidence reference.

Minimum Joaquín-provided evidence:

```text
Railway billing period: <YYYY-MM-01 to YYYY-MM-last-day>
Railway total amount: 192 MXN
Shared hosts count: 4
Explicit approval: equal allocation accepted for PL20 cost accounting
Computed ecommerce allocation: 48 MXN
Evidence reference: <screenshot/export/attestation path>
Measured at: <ISO timestamp>
```

Result if explicitly approved:

```text
railway.measured_state = MEASURED
railway.allocation_model = equal_allocation
railway.amount = 48
railway.currency = MXN
railway.caveats includes "approved accounting allocation; not resource-metered"
```

Without explicit approval:

```text
railway.measured_state = PARTIAL
```

### Method C - `shared_unallocated`

Sufficient evidence:

- selected accounting period;
- Railway billing evidence showing 192 MXN total for the period;
- confirmation that the account remains shared across 4 hosts;
- explicit decision that ecommerce allocation remains unresolved.

Result:

```text
railway.measured_state = PARTIAL
railway.allocation_model = shared_unallocated
railway.amount = null
```

This method preserves historical accuracy but does not close `COST_MEASURED=true`.

Use `shared_unallocated` only if ChatGPT Web/user decides the shared Railway cost should remain unattributed for now.

## Part 2 - Stripe

Shortest path: use Stripe dashboard/export actual fees for one completed calendar month.

Do not request or expose API keys, webhook secrets, account IDs, customer PII, card data, payment card data, or full payment identifiers.

### Preferred Dashboard/Export Source

Stripe evidence should come from a dashboard export or report that covers the selected period and contains actual deducted fees.

Required values:

- accounting period start;
- accounting period end;
- report currency;
- gross payments volume for the period, if available;
- total Stripe fees for the period;
- refunds/disputes fee treatment, if shown;
- report/export generated_at timestamp;
- source type, e.g. `stripe_dashboard_export` or `stripe_balance_report`;
- safe evidence reference, e.g. local filename or screenshot reference;
- operator attestation that the report is from the live Stripe account for Selfcare Sinners ecommerce.

Useful export/report columns if available:

| Needed Value | Preferred Column / Screen Concept |
|---|---|
| Transaction date/time | `created`, `available_on`, or report date |
| Currency | `currency` |
| Gross amount | `gross` or `amount` |
| Stripe fee | `fee` |
| Net amount | `net` |
| Type | `type`, such as charge, refund, dispute, adjustment |
| Description | Redacted/optional, only if needed to distinguish fees |

Minimum accepted aggregate:

```text
Stripe period: <YYYY-MM-01 to YYYY-MM-last-day>
Currency: MXN
Gross volume: <amount or unavailable>
Actual Stripe fees total: <amount>
Refund/dispute treatment: <included|excluded|none observed|unknown>
Source: Stripe dashboard/export
Evidence reference: <safe local screenshot/export name>
Measured at: <ISO timestamp>
```

Result if complete:

```text
stripe.measured_state = MEASURED
stripe.source_type = provider_export or provider_billing
stripe.amount = actual Stripe fee total
stripe.actual_or_estimated = actual
```

If only the 2.9% + conditional 6 MXN fee schedule is provided:

```text
stripe.measured_state = PARTIAL
```

The fee schedule alone is insufficient because the actual period total depends on transaction count, fixed-fee applicability, refunds, disputes, currency conversion, tax treatment, and payout timing.

## Part 3 - Supabase / Resend

Supabase and Resend can remain `MEASURED` at 0 MXN only with explicit zero-cost provenance for the same period used by Railway and Stripe.

### Supabase Required Provenance

Minimum evidence:

```text
Provider: Supabase
Period: same selected month
Plan/tier: Free tier
Amount: 0
Currency: MXN or USD, matching how the provider displays billing
Source type: provider_plan, provider_billing_screen, dashboard_screenshot, or operator_attested_current_plan
Provided by: Joaquín/user/operator
Measured at: <ISO timestamp>
Evidence reference: <safe screenshot/export/attestation path>
Caveat: current free tier cost only; future paid plan is not current cost
```

Do not use production database contents as billing evidence. Database rows can prove app behavior, not Supabase platform cost.

### Resend Required Provenance

Minimum evidence:

```text
Provider: Resend
Period: same selected month
Plan/tier: Free tier
Amount: 0
Currency: MXN or USD, matching how the provider displays billing
Source type: provider_plan, provider_billing_screen, dashboard_screenshot, or operator_attested_current_plan
Provided by: Joaquín/user/operator
Measured at: <ISO timestamp>
Evidence reference: <safe screenshot/export/attestation path>
Caveat: current free tier cost only; no unverified volume allowance claim required
```

Do not use email event rows as billing evidence. Email events can support usage context but do not prove Resend cost.

## Part 4 - Period

Recommended accounting period:

```text
2026-08-01 through 2026-08-31
```

Use this period if provider evidence is available.

Reason:

- It is a completed calendar month before the current date.
- Full-month exports are simpler to compare across Railway, Stripe, Supabase, and Resend.
- Calendar month boundaries match existing PL20 monthly cost semantics.
- It avoids partial-month ambiguity for Stripe fees, Railway billing, and free-tier attestations.

If August 2026 evidence is unavailable, use the latest completed calendar month for which all four providers can provide evidence.

Do not mix periods. If one provider uses a different billing window, record that mismatch and keep total cost `PARTIAL` unless ChatGPT Web explicitly approves a normalized period.

Required period fields for every provider:

```text
period_start = 2026-08-01
period_end = 2026-08-31
period_convention = inclusive calendar month
measured_at = <ISO timestamp when evidence was collected>
```

## Part 5 - Joaquín Manual Checklist

No account IDs. No API keys. No payment card data. No customer PII. No full payment identifiers.

### Railway

Provide one of:

- Resource-based allocation evidence:
  - billing/dashboard screenshot or export showing 192 MXN for the selected month;
  - proof that 4 hosts shared the account cost;
  - ecommerce host/service safe label;
  - selected allocation metric;
  - per-host usage values for all 4 hosts;
  - formula and computed ecommerce amount.

- Equal allocation approval:
  - billing/dashboard screenshot or export showing 192 MXN for the selected month;
  - proof that 4 hosts shared the account cost;
  - explicit written approval: "Use equal allocation for PL20 cost accounting";
  - computed ecommerce amount: 48 MXN.

- Shared-unallocated confirmation:
  - billing/dashboard screenshot or export showing 192 MXN for the selected month;
  - proof that 4 hosts shared the account cost;
  - written confirmation that ecommerce allocation remains unresolved.

Only the first two can close Railway as `MEASURED`. `shared_unallocated` remains `PARTIAL`.

### Stripe

Provide:

- Stripe dashboard/export for selected month;
- actual total Stripe fees for the period;
- currency;
- whether refunds/disputes are included, excluded, absent, or unknown;
- generated/exported timestamp;
- safe evidence reference.

Preferred one-line attestation:

```text
For <period>, Stripe dashboard/export shows actual Stripe fees of <amount> <currency> for Selfcare Sinners ecommerce. Refund/dispute treatment: <included/excluded/none observed/unknown>. Evidence reference: <file>.
```

### Supabase

Provide:

- current plan/billing screen or written attestation showing free tier;
- amount: 0;
- currency displayed or `MXN` if operator-normalized;
- selected period;
- measured_at;
- safe evidence reference.

Preferred one-line attestation:

```text
For <period>, Supabase is on current free tier with 0 recurring platform cost for this project. Evidence reference: <file>.
```

### Resend

Provide:

- current plan/billing screen or written attestation showing free tier;
- amount: 0;
- currency displayed or `MXN` if operator-normalized;
- selected period;
- measured_at;
- safe evidence reference.

Preferred one-line attestation:

```text
For <period>, Resend is on current free tier with 0 recurring email platform cost for this project. Evidence reference: <file>.
```

## Minimum Closure Condition

`COST_MEASURED=true` can be considered only when:

1. One accounting period is selected for all four providers.
2. Railway is either `resource_based` or explicitly approved `equal_allocation`.
3. Stripe actual period fee total is provided from dashboard/export or equivalent actual provider evidence.
4. Supabase zero-cost free-tier provenance is attached for the same period.
5. Resend zero-cost free-tier provenance is attached for the same period.
6. Every provider record has amount, currency, period_start, period_end, actual_or_estimated, source_type, provided_by, measured_at, evidence_reference, and caveats.
7. No provider remains `PARTIAL` or `NOT_MEASURED`.

Expected state after complete evidence:

```text
railway.measured_state = MEASURED
stripe.measured_state = MEASURED
supabase.measured_state = MEASURED
resend.measured_state = MEASURED
cost.total.measured_state = MEASURED
isCostEvidenceMeasured = true
```

This does not imply `finalScaleReady = true`; capacity evidence and all other PL20 readiness requirements remain separate.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- Railway evidence requirements for `resource_based`, `equal_allocation`, and `shared_unallocated`;
- Stripe shortest path to actual cost;
- Supabase and Resend zero-cost provenance requirements;
- recommended shared accounting period;
- minimal Joaquín checklist;
- exact closure condition for `COST_MEASURED=true`.
