# POST-LAUNCH 20 - PL20-03 Preparation Package

Date: 2026-09-19
Mode: PREPARATION ONLY / NO EXECUTION
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This package prepares PL20-03 to begin after PL20-02 receives PASS. It does not run load tests, call billing APIs, mutate production, or modify protected implementation areas.

Created preparation artifacts:

- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03-preparation-package.md`
- `scripts/load/pl20-baseline.k6.js` draft only, not executed

## Current Cost Snapshot

Operator-provided facts:

| Provider | Current Known Fact | Measured State | Notes |
|---|---|---|---|
| Railway | 192 MXN/month total current cost, shared across 4 hosts | `PARTIAL` | Ecommerce allocation not yet defined. |
| Supabase | 0 MXN current cost, free tier | `MEASURED` | Future scaling plan around 20 USD/month is not current cost. |
| Stripe | Approximately 2.9%; fixed 6 MXN applies only in some cases | `PARTIAL` | Actual monthly Stripe fee total not yet measured. |
| Resend | 0 MXN current cost, free tier | `MEASURED` | Current cost is zero with free-tier caveat. |
| `cost.total` | Not final | `PARTIAL` | Railway allocation and Stripe actual fees remain unresolved. |

Do not invent missing amounts. Do not use public pricing pages as measured cost.

## Railway Attribution Options

### Option A - Equal Allocation Across 4 Hosts

Formula:

```text
ecommerce_railway_cost = 192 MXN / 4 = 48 MXN/month
```

Advantages:

- Simple and transparent.
- Can be calculated immediately from operator-provided facts.
- Useful as a temporary estimate.

Limitations:

- Assumes all hosts consume equal resources.
- May understate or overstate ecommerce cost.
- Not actual provider-measured ecommerce cost.

Required evidence:

- Confirmation that 192 MXN/month is the current Railway total.
- Confirmation that 4 hosts share the cost.
- ChatGPT Web/user approval to use equal allocation as an estimate.

### Option B - Usage / Resource-Based Allocation

Formula:

```text
ecommerce_railway_cost =
  total_railway_cost *
  ecommerce_resource_usage /
  total_resource_usage_across_hosts
```

Resource usage could be CPU, memory, runtime hours, request volume, or Railway-provided service usage metrics.

Advantages:

- More faithful to actual resource consumption.
- Better for future scaling decisions.
- Can adapt if ecommerce becomes dominant workload.

Limitations:

- Requires Railway metrics/export or approved dashboard evidence.
- Resource weighting must be defined.
- May still be an allocation model, not a separate invoice.

Required evidence:

- Railway resource usage by host/service for the target period.
- Definition of allocation basis.
- ChatGPT Web/user approval of formula.

### Option C - Shared Infrastructure Cost Kept Unallocated

Formula:

```text
railway_shared_cost = 192 MXN/month
ecommerce_railway_cost = null
allocation_state = unallocated_shared_infrastructure
```

Advantages:

- Avoids false precision.
- Honest when ecommerce allocation is not yet decided.
- Preserves current known cost without inventing ecommerce share.

Limitations:

- Keeps Railway provider cost `PARTIAL` for PL20 finalScaleReady.
- Does not produce an ecommerce-specific total.
- Requires later accounting decision.

Required evidence:

- Confirmation of total Railway current cost.
- Confirmation that allocation is intentionally deferred.
- Caveat recorded in cost evidence.

## Stripe Cost Closure Options

### Option A - Stripe Dashboard / Export Actual Fee Total

Procedure:

1. User/operator exports Stripe fees for the target month.
2. Evidence records total fee amount, currency, period, source type, measured_at, and safe reference.
3. No payment IDs, customer data, card data, or secret keys are stored.

Result:

- Can classify Stripe as `MEASURED` if all required fields are present.

### Option B - Explicit User-Provided Monthly Fee Total

Procedure:

1. User provides monthly Stripe fee total and period.
2. Operator records it as user-supplied evidence.
3. Caveats describe whether it is actual dashboard-derived or estimate.

Result:

- `MEASURED` if user confirms actual provider-derived total.
- `PARTIAL` if user supplies an estimate without provider backing.

### Option C - Transaction-Level Calculation

Procedure:

1. Use transaction totals only if exact fixed-fee applicability is known.
2. Apply exact percent fee and fixed fee rules per transaction.
3. Preserve calculation version and caveats.

Result:

- Can become `MEASURED` only if fee formula, fixed-fee applicability, currency, refunds, disputes, and period are exact.

Why 2.9% + conditional 6 MXN is insufficient:

- Fixed 6 MXN applies only in some cases.
- Monthly total depends on number and type of transactions.
- Refunds, disputes, currency conversion, taxes, and payout timing may affect actual fees.
- A percentage alone cannot prove actual monthly Stripe cost.

## Provider JSON Templates

Use placeholders where values are unknown. Do not fabricate dates or missing amounts.

### Railway

```json
{
  "provider": "railway",
  "amount": null,
  "currency": "MXN",
  "period_start": null,
  "period_end": null,
  "actual_or_estimated": "estimated",
  "source_type": "user_supplied_estimate",
  "provided_by": "user",
  "measured_at": null,
  "evidence_reference": null,
  "measured_state": "PARTIAL",
  "caveats": [
    "Operator-provided total current Railway cost is 192 MXN/month.",
    "Cost is shared across 4 hosts.",
    "Ecommerce allocation has not been selected.",
    "Provider export/invoice period not attached in this preparation package."
  ]
}
```

### Supabase

```json
{
  "provider": "supabase",
  "amount": 0,
  "currency": "MXN",
  "period_start": null,
  "period_end": null,
  "actual_or_estimated": "actual",
  "source_type": "user_supplied_current_plan",
  "provided_by": "user",
  "measured_at": null,
  "evidence_reference": null,
  "measured_state": "MEASURED",
  "caveats": [
    "Current cost is 0 MXN on free tier.",
    "Future scaling plan around 20 USD/month is not current cost.",
    "Attach dashboard/export evidence before durable ingestion if required."
  ]
}
```

### Stripe

```json
{
  "provider": "stripe",
  "amount": null,
  "currency": "MXN",
  "period_start": null,
  "period_end": null,
  "actual_or_estimated": "estimated",
  "source_type": "fee_structure_only",
  "provided_by": "user",
  "measured_at": null,
  "evidence_reference": null,
  "measured_state": "PARTIAL",
  "caveats": [
    "Known fee structure is approximately 2.9%.",
    "Fixed 6 MXN applies only in some cases.",
    "Actual monthly Stripe fee total is not yet measured.",
    "Fee structure alone is insufficient for actual monthly cost."
  ]
}
```

### Resend

```json
{
  "provider": "resend",
  "amount": 0,
  "currency": "MXN",
  "period_start": null,
  "period_end": null,
  "actual_or_estimated": "actual",
  "source_type": "user_supplied_current_plan",
  "provided_by": "user",
  "measured_at": null,
  "evidence_reference": null,
  "measured_state": "MEASURED",
  "caveats": [
    "Current cost is 0 MXN on free tier.",
    "Attach dashboard/export evidence before durable ingestion if required."
  ]
}
```

### Cost Total

```json
{
  "provider": "total",
  "amount": null,
  "currency": "MXN",
  "period_start": null,
  "period_end": null,
  "actual_or_estimated": "mixed",
  "source_type": "derived_from_provider_records",
  "provided_by": "operator",
  "measured_at": null,
  "evidence_reference": null,
  "measured_state": "PARTIAL",
  "caveats": [
    "Railway ecommerce allocation is not defined.",
    "Stripe actual monthly fee total is not measured.",
    "Do not sum unknown/null provider values."
  ]
}
```

## k6 Draft

Draft file:

```text
scripts/load/pl20-baseline.k6.js
```

Properties:

- GET only.
- No auth.
- No cookies.
- No POST.
- No mutation routes.
- `BASE_URL` environment variable required.
- `PL20_ENVIRONMENT`, `PL20_STAGE`, `APPROVED_VUS`, `APPROVED_DURATION`, and `APPROVED_SLEEP_SECONDS` required.
- Per-endpoint tags included.
- JSON summary output via `handleSummary`.
- No thresholds.
- VU/duration/sleep placeholders only through explicit approved environment variables.
- Not executed.

Approved SAFE_READ routes in the draft:

- `/`
- `/api/health`
- `/api/readiness`
- `/api/public/store`
- `/api/public/home`
- `/api/public/categories`
- `/api/products`

## K6 FAIL-CLOSED SAFETY

The draft k6 script was hardened so accidental execution fails closed.

Required environment variables:

| Variable | Requirement |
|---|---|
| `BASE_URL` | Required absolute host/root URL only. Must not include route paths. |
| `PL20_ENVIRONMENT` | Required environment label, e.g. local/staging/production after approval. |
| `PL20_STAGE` | Required stage label, e.g. BASELINE/SMALL/MODERATE after approval. |
| `APPROVED_VUS` | Required integer `>= 1`. No default. |
| `APPROVED_DURATION` | Required non-empty k6-style duration such as `30s`, `5m`, or `1h`. No default. |
| `APPROVED_SLEEP_SECONDS` | Required finite number `>= 0`. No default. |
| `ALLOW_PRODUCTION_LOAD_TEST` | Optional guard flag. Required as `true` only to prevent automatic production-target rejection. |

Production lock:

- `https://selfcaresinners.com` and its trailing slash form are detected as production.
- Production target throws by default.
- `ALLOW_PRODUCTION_LOAD_TEST=true` only disables the accidental production lock.
- This flag does not authorize execution. Actual production execution still requires explicit ChatGPT Web/user approval, approved route list, approved VUs/duration, monitoring, and stop conditions.

SAFE_READ whitelist:

- `/`
- `/api/health`
- `/api/readiness`
- `/api/public/store`
- `/api/public/home`
- `/api/public/categories`
- `/api/products`

If any other route appears in the target list, the script throws before test execution.

BASE_URL safety assertions:

- `BASE_URL` must represent host/root only.
- `BASE_URL` is rejected if it contains obvious mutation/side-effect paths:
  - `/checkout`
  - `/orders`
  - `/admin`
  - `/refund`
  - `/payment`
  - `/webhook`

5xx counter:

- The script defines k6 counter `http_5xx_count`.
- It increments when a response status is `500-599`.
- `handleSummary` exposes `http_5xx_count`.
- No pass/fail thresholds are defined yet.

Summary metadata:

- `PL20_ENVIRONMENT`
- `PL20_STAGE`
- `APPROVED_VUS`
- `APPROVED_DURATION`
- `APPROVED_SLEEP_SECONDS`
- `BASE_URL`
- `ALLOW_PRODUCTION_LOAD_TEST`
- `execution_authorized: false`

Execution remains unauthorized:

- k6 was not installed.
- k6 was not executed.
- localhost, production, Railway, Supabase, Stripe, and Resend were not contacted.

## Safety Exclusions

The draft explicitly excludes:

| Excluded Area | Reason |
|---|---|
| checkout | May create Stripe checkout/payment side effects. |
| orders | May create real orders or order records. |
| payments | May touch Stripe/payment state. |
| refunds | May mutate payment/refund state. |
| email | May send or queue messages. |
| newsletter | May create subscriber records or email events. |
| contact | May create support/contact records or messages. |
| inventory | May mutate stock/catalog state. |
| admin | May expose privileged data or trigger admin mutations. |
| analytics mutation | May create tracking events. |
| ads mutation | May create marketing/ads events. |
| webhooks | Provider event handlers must never be load-tested. |

## k6 Evidence Parser Design

Later parser mapping from k6 summary JSON:

| PL20 Field | k6 Summary Source |
|---|---|
| `requests_total` | `metrics.http_reqs.values.count` |
| `requests_per_second` | `metrics.http_reqs.values.rate` |
| `error_rate` | `metrics.http_req_failed.values.rate` |
| `p50_latency_ms` | `metrics.http_req_duration.values.med` |
| `p95_latency_ms` | `metrics.http_req_duration.values["p(95)"]` |
| `p99_latency_ms` | `metrics.http_req_duration.values["p(99)"]` |
| `max_latency_ms` | `metrics.http_req_duration.values.max` |
| `http_5xx_count` | Count responses with status 500-599; if not emitted by default, add a custom counter in the approved implementation. |

Parser requirements:

- Preserve raw k6 summary JSON.
- Record k6 version separately.
- Record environment and target base URL separately.
- Record approved stage, VUs, and duration separately.
- Do not infer pass/fail until ChatGPT Web approves thresholds.
- Treat missing metrics as `NOT_MEASURED`.

## Local Dry-Run Checklist

Do not execute now. First run after approval:

1. Verify k6 installed.
2. Start local app.
3. Verify SAFE_READ routes manually.
4. Confirm no production env.
5. Confirm no production DB.
6. Run minimum baseline.
7. Capture JSON.
8. Inspect logs.
9. Stop.
10. Return evidence to ChatGPT Web.

Additional local safety checks before step 6:

- Confirm `BASE_URL` points to local app, not production.
- Confirm no Stripe live variables are loaded.
- Confirm no Resend live variables are loaded.
- Confirm no Supabase production DB URL is loaded.
- Confirm route list contains only SAFE_READ targets.

## Final Status

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- current cost snapshot;
- Railway attribution options;
- Stripe closure options;
- provider JSON templates;
- k6 draft;
- safety exclusions;
- k6 evidence mapping;
- local dry-run checklist.
