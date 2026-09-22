# POST-LAUNCH 20 - PL20-03 Execution Specification

Date: 2026-09-19
Mode: READ-ONLY / DESIGN
Scope: Real cost + controlled capacity measurement
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This specification turns the existing cost/capacity plan into an executable PL20-03 procedure without calling billing APIs, creating provider resources, touching production data, or running load tests.

PL20-03 must preserve the current trust boundary:

- no public pricing pages as measured cost;
- no arbitrary capacity thresholds;
- no mutation routes in initial load testing;
- no live Stripe, Resend, Railway, or Supabase changes;
- no finalScaleReady promotion from partial cost/capacity evidence.

## Part 1 - Cost Execution Checklist

Each provider must be collected as an independent cost record with:

- `amount`
- `currency`
- `period_start`
- `period_end`
- `actual_or_estimated`
- `source_type`
- `provided_by`
- `measured_at`
- `evidence_reference`
- `caveats`

Preferred sources:

1. Manual provider dashboard export.
2. Explicit user-supplied billing evidence.
3. API automation only after separate explicit approval.

Do not use public pricing pages as measured cost.

### Railway

Operator procedure:

1. Ask user/ChatGPT Web to approve Railway cost evidence collection.
2. Prefer user-provided Railway invoice, usage export, billing screenshot, or plan/billing dashboard export.
3. Record only aggregate billing amount, period, currency, source type, and safe evidence reference.
4. Do not store account IDs, tokens, invoice private URLs, payment methods, or secrets.
5. If only user estimate is available, classify as estimate and capture caveats.

Required record:

| Field | Railway value rule |
|---|---|
| `amount` | Billing/export amount or explicit user-supplied estimate. |
| `currency` | Currency shown by Railway/export or user-declared currency. |
| `period_start` | Billing period start from export/invoice or user declaration. |
| `period_end` | Billing period end from export/invoice or user declaration. |
| `actual_or_estimated` | `actual` for invoice/export; `estimated` for user forecast. |
| `source_type` | `provider_billing`, `provider_export`, `manual_dashboard_capture`, or `user_supplied_estimate`. |
| `provided_by` | `user`, `operator_from_dashboard`, or later approved `provider_api`. |
| `measured_at` | Timestamp of collection. |
| `evidence_reference` | Safe local evidence path or written attestation reference. |
| `caveats` | Taxes, credits, partial month, shared project cost, or estimate caveat. |

### Supabase

Operator procedure:

1. Ask user/ChatGPT Web to approve Supabase cost evidence collection.
2. Prefer Supabase billing export/invoice/dashboard capture or explicit user-supplied project cost.
3. Do not query production data for billing. Production DB activity is usage support, not billing cost.
4. Do not expose project secrets, service role keys, connection strings, or payment details.

Required record:

| Field | Supabase value rule |
|---|---|
| `amount` | Supabase invoice/export amount or explicit estimate. |
| `currency` | Provider/user-declared currency. |
| `period_start` | Billing period start. |
| `period_end` | Billing period end. |
| `actual_or_estimated` | `actual` for invoice/export; `estimated` for user estimate. |
| `source_type` | `provider_billing`, `provider_export`, `manual_dashboard_capture`, or `user_supplied_estimate`. |
| `provided_by` | `user`, `operator_from_dashboard`, or approved `provider_api`. |
| `measured_at` | Timestamp of collection. |
| `evidence_reference` | Safe evidence reference, no secret URL. |
| `caveats` | Free tier, credits, shared project, usage not included, estimate basis. |

### Stripe

Operator procedure:

1. Ask user/ChatGPT Web to approve Stripe fee/cost evidence collection.
2. Prefer Stripe balance/report export or user-provided fee summary for the period.
3. Do not call live Stripe API unless separately approved.
4. Existing `stripe_events` can support activity counts but cannot prove fees by itself.
5. Do not expose payment intent IDs, customer data, card data, payout account data, or secret keys.

Required record:

| Field | Stripe value rule |
|---|---|
| `amount` | Actual Stripe fees/report amount or explicit fee estimate/model result. |
| `currency` | Stripe report currency or user-declared currency. |
| `period_start` | Reporting period start. |
| `period_end` | Reporting period end. |
| `actual_or_estimated` | `actual` for Stripe report/export; `estimated` for fee model. |
| `source_type` | `provider_billing`, `provider_export`, `manual_dashboard_capture`, or `user_supplied_estimate`. |
| `provided_by` | `user`, `operator_from_dashboard`, or approved `provider_api`. |
| `measured_at` | Timestamp of collection. |
| `evidence_reference` | Safe export/report reference. |
| `caveats` | Gross/fee distinction, refunds, currency conversion, tax, payout timing. |

### Resend

Operator procedure:

1. Ask user/ChatGPT Web to approve Resend cost evidence collection.
2. Prefer Resend dashboard billing/usage export or user-provided plan/usage amount.
3. Existing `email_events` can support email volume but cannot prove billing cost by itself.
4. Do not call Resend API unless separately approved.
5. Do not expose API keys, webhook secrets, recipient emails, or private billing identifiers.

Required record:

| Field | Resend value rule |
|---|---|
| `amount` | Resend billing/export amount or explicit estimate. |
| `currency` | Provider/user-declared currency. |
| `period_start` | Billing/usage period start. |
| `period_end` | Billing/usage period end. |
| `actual_or_estimated` | `actual` for invoice/export; `estimated` for plan/usage estimate. |
| `source_type` | `provider_billing`, `provider_export`, `manual_dashboard_capture`, or `user_supplied_estimate`. |
| `provided_by` | `user`, `operator_from_dashboard`, or approved `provider_api`. |
| `measured_at` | Timestamp of collection. |
| `evidence_reference` | Safe evidence reference. |
| `caveats` | Free tier, email volume, plan tier, shared account, estimate basis. |

## Part 2 - Cost Acceptance Rules

Provider states:

| State | Definition | finalScaleReady eligible? |
|---|---|---|
| `MEASURED` | Provider has all required fields, explicit provenance, valid period, valid currency, amount is finite and non-negative, and zero is supported by provenance if amount is 0. | Yes |
| `PARTIAL` | Provider has some evidence but is missing one or more required fields, uses an estimate with incomplete assumptions, has unclear period/currency, or has caveats that prevent full confidence. | No |
| `NOT_MEASURED` | Provider record is absent, amount is unknown, amount is zero without provenance, source is public pricing page only, or evidence cannot be tied to provider/period. | No |

Exact `cost.total` rule:

- If all four providers are `MEASURED`, `cost.total.state = MEASURED`.
- If any provider is `PARTIAL`, `cost.total.state = PARTIAL`.
- If any provider is `NOT_MEASURED`, `cost.total.state = PARTIAL` unless all providers are missing, in which case `cost.total.state = NOT_MEASURED`.
- `cost.total.amount` may be shown only as sum of providers with explicit amount/provenance.
- `cost.total` must preserve provider-level states and caveats.

Required for `finalScaleReady`:

```text
Railway = MEASURED
Supabase = MEASURED
Stripe = MEASURED
Resend = MEASURED
cost.total = MEASURED
```

`PARTIAL` is insufficient for finalScaleReady.

## Part 3 - Local Load Test Spec

Initial tool: k6.

Do not create or run the script in this task.

Initial route policy:

- only `SAFE_READ` routes;
- no auth;
- no cookies;
- no POST/PUT/PATCH/DELETE;
- no checkout;
- no emails;
- no inventory;
- no admin;
- no webhooks;
- no real order/customer flows.

Initial candidate targets:

- `/`
- `/api/health`
- `/api/readiness`
- `/api/public/store`
- `/api/public/home`
- `/api/public/categories`
- `/api/products`

### k6 Scenario Specification

Script characteristics:

- base URL passed by environment variable, e.g. `BASE_URL`;
- scenario name includes environment and stage;
- every request tagged by endpoint;
- fail condition detects non-2xx/3xx responses;
- no request body;
- no auth header;
- no redirect into checkout/admin paths;
- output JSON summary saved for evidence;
- route list hardcoded from approved SAFE_READ set.

Pseudo-structure:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL;
const targets = [
  '/',
  '/api/health',
  '/api/readiness',
  '/api/public/store',
  '/api/public/home',
  '/api/public/categories',
  '/api/products'
];

export const options = {
  scenarios: {
    approved_stage_name: {
      executor: 'constant-vus',
      vus: APPROVED_VUS,
      duration: 'APPROVED_DURATION'
    }
  }
};

export default function () {
  for (const path of targets) {
    const res = http.get(`${baseUrl}${path}`, { tags: { endpoint: path } });
    check(res, {
      'status is safe success': (r) => r.status >= 200 && r.status < 400
    });
    sleep(APPROVED_SLEEP_SECONDS);
  }
}
```

`APPROVED_VUS`, `APPROVED_DURATION`, and `APPROVED_SLEEP_SECONDS` must be filled only after ChatGPT Web/user approval.

## Part 4 - Stage Design

No final VU thresholds are defined here. Numbers must later be approved from baseline evidence.

| Stage | Goal | Duration Methodology | Concurrency Selection Rule | Success Data Required | Abort Conditions |
|---|---|---|---|---|---|
| `BASELINE` | Validate script correctness and capture single/near-single-user latency/error baseline. | Short enough to avoid provider stress; long enough to collect repeated samples across all SAFE_READ routes. | Use minimum practical concurrency approved by ChatGPT Web, expected to be one or near-one user. | Complete k6 summary, per-route latency percentiles, error rate, request count, no side effects, environment notes. | Any 5xx spike, unexpected mutation route, app crash, DB errors, Railway restart, visible degradation. |
| `SMALL` | Verify low concurrent read-only behavior after baseline review. | Derived from baseline duration and approved by ChatGPT Web. | Small concurrency derived from baseline stability, not arbitrary target. | Same as baseline plus Railway/Supabase observation if environment is remote. | Baseline regression beyond approved threshold, 5xx, restart, DB pressure, rate-limit cascade, side-effect route hit. |
| `MODERATE` | Establish a validated operating envelope, not high-scale proof. | Approved after SMALL evidence. | Moderate concurrency selected from baseline/small results and provider plan limits, with explicit second approval. | Full k6 summary, Railway CPU/memory/restarts, Supabase pressure/latency if available, stop-condition log. | Any approved threshold breach, provider saturation, user-visible degradation, DB errors, external side effect. |

## Part 5 - Capacity Acceptance Data

Capacity evidence record:

| Field | Requirement |
|---|---|
| `tool` | REQUIRED |
| `version` | REQUIRED |
| `environment` | REQUIRED |
| `scenario` | REQUIRED |
| `started_at` | REQUIRED |
| `completed_at` | REQUIRED |
| `duration` | REQUIRED |
| `concurrent_users` | REQUIRED |
| `requests_total` | REQUIRED |
| `requests_per_second` | REQUIRED |
| `error_rate` | REQUIRED |
| `p50_latency_ms` | REQUIRED |
| `p95_latency_ms` | REQUIRED |
| `p99_latency_ms` | REQUIRED |
| `max_latency_ms` | REQUIRED |
| `http_5xx_count` | REQUIRED |

Railway evidence:

| Field | Requirement | Notes |
|---|---|---|
| `CPU` | REQUIRED for remote/staging/production capacity acceptance; CURRENTLY_UNAVAILABLE from repo alone | Requires Railway dashboard/API/log evidence. |
| `memory` | REQUIRED for remote/staging/production capacity acceptance; partial from runtime only | Runtime RSS alone is not capacity proof. |
| `restarts` | REQUIRED for remote/staging/production capacity acceptance | Requires Railway logs/dashboard. |

Supabase evidence:

| Field | Requirement | Notes |
|---|---|---|
| `connection pressure` | REQUIRED for scale-ready capacity; CURRENTLY_UNAVAILABLE from repo alone | Requires Supabase dashboard/API or approved read-only metrics. |
| `query latency` | REQUIRED for remote/staging/production capacity acceptance where DB routes are included | `/api/health` latency is partial; provider DB metrics preferred. |
| `slow queries` | OPTIONAL for baseline; REQUIRED for scale-ready capacity | Needs provider or approved DB evidence. |
| `pool saturation` | REQUIRED for scale-ready capacity; CURRENTLY_UNAVAILABLE from repo alone | Requires Supabase/pool metrics. |

Interpretation:

- Baseline measurement can be accepted with k6 data alone plus confirmation no side effects occurred.
- Remote capacity acceptance requires platform and DB observations.
- Scale-ready capacity requires load evidence plus Railway and Supabase pressure evidence.

## Part 6 - Safe Environment Sequence

Required sequence:

1. Local script validation.
   - Validate k6 script syntax and route list only.
   - Use local app/test setup.
   - No production.
2. Isolated/staging if available.
   - Use Railway preview/staging and non-production data if available.
   - Do not create staging resources in PL20-03 without approval.
3. Production read-only baseline only after explicit approval.
   - SAFE_READ routes only.
   - Lowest approved concurrency.
   - Monitoring ready.
4. Production small concurrency only after baseline review.
   - Requires ChatGPT Web review of baseline.
   - Requires explicit approval.
5. Moderate concurrency only after explicit second approval.
   - Requires baseline and small evidence.
   - Requires approved thresholds and abort plan.

No environment creation is authorized by this specification.

## Part 7 - SLO / Threshold Policy

No arbitrary thresholds.

Allowed threshold sources:

1. Baseline-derived:
   - Derive max error rate, p95, p99, and regression bounds from measured baseline.
2. Existing product SLO:
   - Use only if documented and current.
3. Provider-plan limits:
   - Use Railway/Supabase plan limits only after actual plan evidence is collected.

Threshold fields:

| Threshold | Methodology |
|---|---|
| `max_error_rate` | Baseline-derived or SLO-derived. If absent: `PENDING_CHATGPT_WEB_APPROVAL`. |
| `p95_threshold` | Baseline-derived, route-class-specific, or SLO-derived. If absent: `PENDING_CHATGPT_WEB_APPROVAL`. |
| `p99_threshold` | Baseline-derived or SLO-derived. If absent: `PENDING_CHATGPT_WEB_APPROVAL`. |
| `acceptable_CPU_memory` | Provider-plan-derived or dashboard baseline-derived. If absent: `PENDING_CHATGPT_WEB_APPROVAL`. |
| `DB_pressure_threshold` | Supabase/provider metrics derived. If absent: `PENDING_CHATGPT_WEB_APPROVAL`. |

Before any production run, ChatGPT Web must approve:

- max error rate;
- p95 threshold;
- p99 threshold;
- CPU/memory abort criteria;
- DB pressure abort criteria;
- duration;
- VU count;
- route list.

## Part 8 - Stop Conditions

Mandatory stop conditions:

- HTTP 5xx spike.
- Approved latency threshold exceeded.
- Railway restart.
- CPU or memory saturation.
- Supabase connection pressure.
- DB errors.
- Rate-limit cascade.
- Any external side-effect route hit.
- Any mutation route hit.
- Checkout/Stripe route hit.
- Resend/email route hit.
- Inventory/order/admin mutation hit.
- User-visible degradation.
- Unexpected logs indicating unhandled exception or provider stress.

If any stop condition is triggered:

1. Stop the test immediately.
2. Preserve partial evidence.
3. Record the triggering condition.
4. Do not proceed to next stage.
5. Return evidence to ChatGPT Web.

## Part 9 - PL20-03 Exit Criteria

### COST_MEASURED

`COST_MEASURED` is achieved when:

- Railway cost = `MEASURED`;
- Supabase cost = `MEASURED`;
- Stripe cost = `MEASURED`;
- Resend cost = `MEASURED`;
- `cost.total = MEASURED`;
- all records include required fields, provenance, period, currency, measured_at, evidence reference, and caveats.

`PARTIAL` cost evidence is not enough.

### CAPACITY_BASELINE_MEASURED

`CAPACITY_BASELINE_MEASURED` is achieved when:

- approved SAFE_READ route list is tested;
- k6 evidence record includes all required k6 fields;
- no mutation/external side-effect route is hit;
- no stop condition is triggered;
- baseline thresholds remain marked as baseline evidence, not scale-ready proof;
- environment is clearly identified.

This can be achieved locally or in an approved remote read-only baseline, depending on ChatGPT Web's acceptance criteria.

### CAPACITY_SCALE_MEASURED

`CAPACITY_SCALE_MEASURED` is achieved only when:

- baseline and small-stage evidence have passed review;
- moderate stage is explicitly approved and executed;
- k6 evidence includes all required fields;
- Railway CPU, memory, and restart evidence is captured;
- Supabase connection pressure, query latency, slow query/pool evidence is captured or explicitly marked unavailable by ChatGPT Web;
- approved thresholds are met;
- no stop condition is triggered.

### Scale-Ready Capacity

Scale-ready capacity is stronger than `CAPACITY_BASELINE_MEASURED`.

PL20-03 does not need to prove high-scale readiness immediately. It may exit with:

- `COST_MEASURED` + `CAPACITY_BASELINE_MEASURED`;
- or `COST_MEASURED` + partial capacity if ChatGPT Web decides PL20-03 is a staged measurement milestone;
- but `finalScaleReady` must not become true unless required cost and capacity conditions are fully satisfied.

## Decisions Requiring Explicit User / ChatGPT Web Approval

- Collecting provider billing evidence.
- Recording any provider as `MEASURED`.
- Calling Railway, Supabase, Stripe, or Resend APIs.
- Running any k6 test.
- Installing k6 or adding it to repo tooling.
- Selecting final VU counts or durations.
- Selecting production as target environment.
- Moving from baseline to small concurrency.
- Moving from small to moderate concurrency.
- Defining final pass/fail thresholds.
- Treating unavailable Railway/Supabase metrics as acceptable.
- Marking `CAPACITY_SCALE_MEASURED`.
- Changing `finalScaleReady` based on PL20-03 evidence.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- exact cost collection checklist;
- cost acceptance rules;
- k6 scenario specification;
- stage design;
- evidence fields;
- environment sequence;
- threshold methodology;
- stop conditions;
- PL20-03 exit criteria;
- decisions requiring explicit user approval.
