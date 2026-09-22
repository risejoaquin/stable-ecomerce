# POST-LAUNCH 20 - PL20-03E Cost Evidence Operator Pack

Date: 2026-09-19
Mode: READ-ONLY / EVIDENCE PREPARATION
Current main provided by ChatGPT Web: `9ec3d0fc14367288d9551c9c8d3da4abac686487`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This operator pack prepares the exact evidence package and manual workflow needed to close all four provider cost dimensions for one common completed accounting period.

No provider cost is invented. No billing API was called. No secrets were fetched or exposed. No Railway, Supabase, Stripe, or Resend resources were mutated. No provider rows were persisted.

Formal state remains:

- PL20-01 PASS / CLOSED
- PL20-02 PASS / CLOSED
- PL20-03A PASS / CLOSED
- PL20-03B PASS / CLOSED
- PL20-03C PASS / CLOSED
- PL20-03D PASS / CLOSED
- PL20-03 ACTIVE
- PL21 NOT STARTED
- `finalScaleReady = false`

## Current Cost State

| Provider | State | Current Fact | Closure Gap |
|---|---|---|---|
| Railway | `PARTIAL` | 192 MXN/month shared across 4 hosts | Ecommerce allocation unresolved |
| Supabase | `MEASURED` candidate | Current free tier, 0 MXN | Same-period provenance required |
| Stripe | `PARTIAL` | Approximately 2.9% plus conditional 6 MXN in some cases | Actual period fee total unknown |
| Resend | `MEASURED` candidate | Current free tier, 0 MXN | Same-period provenance required |
| `COST_MEASURED` | `false` | Cost total requires all four providers measured | Railway and Stripe remain partial |

## Task 1 - Accounting Period

Recommended common accounting period:

```text
2026-08-01 through 2026-08-31
```

Use this period only if evidence for all four providers can be obtained for the same completed calendar month.

Why this is preferred:

- It is a completed calendar month before the current date.
- Calendar month boundaries align with the PL20 monthly cost contract.
- Stripe exports, Railway billing evidence, and free-tier attestations are easiest to compare over a full month.
- It avoids partial-month ambiguity.

If August 2026 cannot be supported for all four providers:

```text
Use the latest completed calendar month with complete evidence across Railway, Supabase, Stripe, and Resend.
```

Do not mix provider periods. If any provider evidence covers a different period, keep `cost.total = PARTIAL` unless ChatGPT Web explicitly approves a normalization rule later.

Common period fields:

```json
{
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "period_convention": "inclusive_calendar_month"
}
```

## Task 2 - Railway Closure Options

Railway can close only through one complete path. Do not convert Railway to `MEASURED` while allocation remains unresolved.

### Option A - `resource_based`

Required evidence:

- billing amount for the selected period;
- proof that 4 active hosts/services shared the cost during the same period;
- ecommerce service safe label;
- selected usage metric;
- per-host usage values for all 4 hosts/services;
- allocation formula;
- attributable ecommerce amount;
- currency;
- evidence reference;
- measured_at timestamp;
- caveat if the usage metric is proxy-based rather than provider-metered allocation.

Minimum operator input:

```text
Railway period: 2026-08-01 through 2026-08-31
Railway billing amount: 192 MXN
Active shared hosts/services: 4
Ecommerce service label: <safe label>
Usage metric: <runtime-hours|memory-hours|CPU-hours|requests|other approved metric>
Usage values:
  ecommerce: <number> <unit>
  host_2: <number> <unit>
  host_3: <number> <unit>
  host_4: <number> <unit>
Formula: ecommerce_usage / total_usage * 192 MXN
Attributable ecommerce amount: <computed amount> MXN
Evidence reference: <safe screenshot/export/attestation path>
Measured at: <ISO timestamp>
Caveat: <none or proxy metric caveat>
```

Candidate result if complete:

```json
{
  "provider": "railway",
  "amount": "<computed_amount>",
  "currency": "MXN",
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "actual_or_estimated": "actual_or_estimated_based_on_source",
  "source_type": "provider_billing_plus_resource_allocation",
  "provided_by": "joaquin_operator",
  "measured_at": "<ISO timestamp>",
  "evidence_reference": "<safe evidence reference>",
  "measured_state": "MEASURED",
  "allocation_model": "resource_based",
  "caveats": [
    "Resource-based allocation selected by operator/ChatGPT Web.",
    "If metric is proxy-based, allocation is measured as an approved accounting allocation, not provider-native ecommerce invoice separation."
  ]
}
```

### Option B - `equal_allocation`

Required evidence:

- billing amount for the selected period;
- confirmation exactly 4 hosts shared cost;
- explicit user approval for equal allocation;
- computed amount: `192 / 4 = 48 MXN`;
- evidence reference;
- measured_at timestamp;
- caveat: approved accounting convention, not provider-metered allocation.

Minimum operator input:

```text
Railway period: 2026-08-01 through 2026-08-31
Railway billing amount: 192 MXN
Active shared hosts/services: exactly 4
Explicit approval: Use equal allocation for PL20 cost accounting
Formula: 192 / 4 = 48 MXN
Attributable ecommerce amount: 48 MXN
Evidence reference: <safe screenshot/export/attestation path>
Measured at: <ISO timestamp>
Caveat: approved accounting convention, not provider-metered allocation
```

Candidate result if complete:

```json
{
  "provider": "railway",
  "amount": 48,
  "currency": "MXN",
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "actual_or_estimated": "estimated",
  "source_type": "operator_approved_equal_allocation",
  "provided_by": "joaquin_operator",
  "measured_at": "<ISO timestamp>",
  "evidence_reference": "<safe evidence reference>",
  "measured_state": "MEASURED",
  "allocation_model": "equal_allocation",
  "caveats": [
    "Equal allocation explicitly approved for PL20 cost accounting.",
    "Approved accounting convention, not provider-metered ecommerce allocation."
  ]
}
```

If neither path is complete:

```json
{
  "provider": "railway",
  "amount": null,
  "currency": "MXN",
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "actual_or_estimated": "estimated",
  "source_type": "operator_attested_shared_account_cost",
  "provided_by": "joaquin_operator",
  "measured_at": "<ISO timestamp>",
  "evidence_reference": "<safe evidence reference>",
  "measured_state": "PARTIAL",
  "allocation_model": "shared_unallocated",
  "caveats": [
    "Railway account cost is 192 MXN/month shared across 4 hosts.",
    "Ecommerce allocation unresolved.",
    "Do not divide by 4 without explicit equal-allocation approval."
  ]
}
```

## Task 3 - Stripe Closure

Shortest operator workflow:

1. Open Stripe Dashboard for the live Selfcare Sinners ecommerce account.
2. Navigate to Balance / Reports / Fees or an equivalent Stripe dashboard export that exposes actual fees.
3. Filter the selected completed month exactly.
4. Export or screenshot aggregate fee evidence.
5. Record only aggregate values and safe references.

Required Stripe evidence:

- `period_start`;
- `period_end`;
- currency;
- gross volume if available;
- actual Stripe fees total;
- refund/dispute treatment;
- export/generated timestamp;
- source_type;
- evidence_reference;
- operator attestation that evidence belongs to Selfcare Sinners live ecommerce.

Do not use the fee schedule alone.

Do not derive actual fees from:

```text
approximately 2.9% + conditional 6 MXN in some cases
```

Candidate complete Stripe record:

```json
{
  "provider": "stripe",
  "amount": "<actual_period_fee_total>",
  "currency": "MXN",
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "actual_or_estimated": "actual",
  "source_type": "stripe_dashboard_export",
  "provided_by": "joaquin_operator",
  "measured_at": "<ISO timestamp>",
  "evidence_reference": "<safe Stripe export or screenshot reference>",
  "measured_state": "MEASURED",
  "allocation_model": "dedicated_ecommerce",
  "caveats": [
    "Actual Stripe fees total from selected period evidence.",
    "Refund/dispute treatment: <included|excluded|none_observed|unknown_from_export>.",
    "No fee calculation was derived from schedule alone."
  ]
}
```

Incomplete Stripe record if only fee schedule is known:

```json
{
  "provider": "stripe",
  "amount": null,
  "currency": "MXN",
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "actual_or_estimated": "estimated",
  "source_type": "fee_schedule_only",
  "provided_by": "joaquin_operator",
  "measured_at": "<ISO timestamp>",
  "evidence_reference": "<operator attestation reference>",
  "measured_state": "PARTIAL",
  "allocation_model": "dedicated_ecommerce",
  "caveats": [
    "Known fact: approximately 2.9% plus conditional 6 MXN in some cases.",
    "Actual period fee total unknown.",
    "Do not calculate actual cost from fee schedule."
  ]
}
```

## Task 4 - Supabase Zero-Cost Provenance

Supabase can close as zero cost only with same-period provenance.

Required evidence:

- selected common period;
- plan/tier;
- amount;
- currency;
- source_type;
- provided_by;
- measured_at;
- evidence_reference;
- caveat: current free tier only; future paid plan excluded.

Do not use database contents as billing evidence.

Candidate Supabase record:

```json
{
  "provider": "supabase",
  "amount": 0,
  "currency": "MXN",
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "actual_or_estimated": "actual",
  "source_type": "provider_plan_or_operator_attested_free_tier",
  "provided_by": "joaquin_operator",
  "measured_at": "<ISO timestamp>",
  "evidence_reference": "<safe Supabase plan screenshot or attestation reference>",
  "measured_state": "MEASURED",
  "allocation_model": "dedicated_ecommerce",
  "caveats": [
    "Current free tier only.",
    "Future paid plan excluded from current cost.",
    "Production database contents are not billing evidence."
  ]
}
```

## Task 5 - Resend Zero-Cost Provenance

Resend can close as zero cost only with same-period provenance.

Required evidence:

- selected common period;
- plan/tier;
- amount;
- currency;
- source_type;
- provided_by;
- measured_at;
- evidence_reference;
- caveat: current free tier only.

Do not invent monthly volume allowances.

Candidate Resend record:

```json
{
  "provider": "resend",
  "amount": 0,
  "currency": "MXN",
  "period_start": "2026-08-01",
  "period_end": "2026-08-31",
  "actual_or_estimated": "actual",
  "source_type": "provider_plan_or_operator_attested_free_tier",
  "provided_by": "joaquin_operator",
  "measured_at": "<ISO timestamp>",
  "evidence_reference": "<safe Resend plan screenshot or attestation reference>",
  "measured_state": "MEASURED",
  "allocation_model": "dedicated_ecommerce",
  "caveats": [
    "Current free tier only.",
    "No unverified monthly volume allowance is claimed."
  ]
}
```

## Task 6 - Joaquín Manual Evidence Checklist

Never request:

- API keys;
- account IDs;
- customer PII;
- card data;
- full payment identifiers;
- service-role secrets.

### Railway

Required for either closure path:

- [ ] Screenshot/export showing selected period.
- [ ] Billing amount for selected period.
- [ ] Currency.
- [ ] Confirmation exactly 4 hosts/services shared the cost.
- [ ] Allocation method selected: `resource_based` or `equal_allocation`.

For `resource_based`:

- [ ] Ecommerce service safe label.
- [ ] Usage metric.
- [ ] Usage value for ecommerce service.
- [ ] Usage values for the other 3 hosts/services.
- [ ] Formula.
- [ ] Computed attributable ecommerce amount.
- [ ] Caveat if proxy-based.

For `equal_allocation`:

- [ ] Explicit written approval to use equal allocation.
- [ ] Computed amount: `192 / 4 = 48 MXN`.
- [ ] Caveat: approved accounting convention, not provider-metered allocation.

### Stripe

- [ ] Stripe Dashboard / Balance / Fees / export screenshot or file.
- [ ] Selected period.
- [ ] Currency.
- [ ] Actual Stripe fees total.
- [ ] Gross volume if available.
- [ ] Refund/dispute treatment.
- [ ] Export/generated timestamp.
- [ ] Safe evidence reference.
- [ ] Operator attestation that evidence belongs to Selfcare Sinners live ecommerce.

### Supabase

- [ ] Plan screenshot or operator attestation.
- [ ] Free tier.
- [ ] Amount: 0.
- [ ] Currency.
- [ ] Same selected period.
- [ ] measured_at timestamp.
- [ ] Evidence reference.
- [ ] Caveat: current free tier only; future paid plan excluded.

### Resend

- [ ] Plan screenshot or operator attestation.
- [ ] Free tier.
- [ ] Amount: 0.
- [ ] Currency.
- [ ] Same selected period.
- [ ] measured_at timestamp.
- [ ] Evidence reference.
- [ ] Caveat: current free tier only.

## Task 7 - Candidate Provider Record Set

Complete record set can be prepared only after Joaquín supplies actual evidence. Until then, records containing placeholders remain candidates and must not be persisted as `MEASURED`.

```json
{
  "period": {
    "period_start": "2026-08-01",
    "period_end": "2026-08-31",
    "period_convention": "inclusive_calendar_month"
  },
  "providers": [
    {
      "provider": "railway",
      "amount": "<48 or resource_based_amount>",
      "currency": "MXN",
      "period_start": "2026-08-01",
      "period_end": "2026-08-31",
      "actual_or_estimated": "<actual|estimated>",
      "source_type": "<provider_billing_plus_resource_allocation|operator_approved_equal_allocation>",
      "provided_by": "joaquin_operator",
      "measured_at": "<ISO timestamp>",
      "evidence_reference": "<safe evidence reference>",
      "measured_state": "<MEASURED only if complete>",
      "allocation_model": "<resource_based|equal_allocation>",
      "caveats": []
    },
    {
      "provider": "supabase",
      "amount": 0,
      "currency": "MXN",
      "period_start": "2026-08-01",
      "period_end": "2026-08-31",
      "actual_or_estimated": "actual",
      "source_type": "provider_plan_or_operator_attested_free_tier",
      "provided_by": "joaquin_operator",
      "measured_at": "<ISO timestamp>",
      "evidence_reference": "<safe evidence reference>",
      "measured_state": "<MEASURED only if same-period provenance attached>",
      "allocation_model": "dedicated_ecommerce",
      "caveats": [
        "Current free tier only; future paid plan excluded."
      ]
    },
    {
      "provider": "stripe",
      "amount": "<actual_period_fee_total>",
      "currency": "MXN",
      "period_start": "2026-08-01",
      "period_end": "2026-08-31",
      "actual_or_estimated": "actual",
      "source_type": "stripe_dashboard_export",
      "provided_by": "joaquin_operator",
      "measured_at": "<ISO timestamp>",
      "evidence_reference": "<safe evidence reference>",
      "measured_state": "<MEASURED only if actual fee total supplied>",
      "allocation_model": "dedicated_ecommerce",
      "caveats": [
        "Actual Stripe fee total from provider evidence; not derived from fee schedule."
      ]
    },
    {
      "provider": "resend",
      "amount": 0,
      "currency": "MXN",
      "period_start": "2026-08-01",
      "period_end": "2026-08-31",
      "actual_or_estimated": "actual",
      "source_type": "provider_plan_or_operator_attested_free_tier",
      "provided_by": "joaquin_operator",
      "measured_at": "<ISO timestamp>",
      "evidence_reference": "<safe evidence reference>",
      "measured_state": "<MEASURED only if same-period provenance attached>",
      "allocation_model": "dedicated_ecommerce",
      "caveats": [
        "Current free tier only."
      ]
    }
  ]
}
```

## Task 8 - Cost Total Rule

Exact closure rule:

```text
Railway MEASURED
AND Supabase MEASURED
AND Stripe MEASURED
AND Resend MEASURED
=> cost.total = MEASURED
=> isCostEvidenceMeasured = true
```

Any partial provider:

```text
Any provider PARTIAL
=> cost.total = PARTIAL
=> isCostEvidenceMeasured = false
```

Required final condition:

```text
railway.measured_state = MEASURED
supabase.measured_state = MEASURED
stripe.measured_state = MEASURED
resend.measured_state = MEASURED
cost.total.measured_state = MEASURED
isCostEvidenceMeasured = true
```

This does not imply:

```text
finalScaleReady = true
```

Capacity and all other PL20 readiness requirements remain separate.

## Task 9 - No Implementation Yet

This task does not:

- modify `server.ts`;
- modify tests;
- modify workflows;
- modify Supabase;
- modify Railway;
- modify Stripe;
- modify Resend;
- persist provider rows;
- call billing APIs;
- create infrastructure.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- recommended common period;
- Railway closure choices;
- Stripe exact evidence requirements;
- Supabase and Resend zero-cost provenance;
- operator checklist;
- candidate provider records;
- exact closure condition.
