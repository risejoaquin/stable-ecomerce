# POST-LAUNCH 20 - Cost + Capacity Measurement Plan

Date: 2026-09-18
Mode: READ-ONLY / DESIGN / AUDIT
Current main provided by ChatGPT Web: `1e104f0ac868388a2fa76cb05019100cfbc9f3bd`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This document designs safe future procedures for turning:

- `cost = NOT_MEASURED`
- `capacity = NOT_MEASURED_AT_SCALE`

into real measured evidence.

No load test was executed. No provider API was called. No secrets were fetched or exposed. No production database, Supabase schema, Stripe live configuration, QA script, test, `server.ts`, current-task, handoff, or validation file was modified.

## Repository Findings

- Production deployment is documented as Railway.
- Supabase, Stripe, and Resend are integrated through application SDKs and environment variables.
- `package.json` has no `k6` or `artillery` dependency.
- Existing production smoke script `scripts/qa/smoke-production.ps1` uses read-only GET checks.
- Existing `scripts/qa/smoke-performance-cost.ps1` includes mutating POST checks that create internal load/cost/profile rows. It is not suitable as a safe capacity test source.
- Existing `scripts/qa/measure-post-ux-c.ps1` captures PageSpeed/Lighthouse-style performance data, not concurrent load capacity.

## Part A - Operating Cost Sources

Do not invent provider costs from public pricing pages. Costs must come from provider billing, provider plan/export, existing verified internal data, or explicit user-supplied amounts.

| PROVIDER | AVAILABLE SOURCE | AUTOMATABLE? | ACTUAL vs ESTIMATED | PERIOD | CURRENCY | DATA REQUIRED | SAFE COLLECTION METHOD | LIMITATION |
|---|---|---|---|---|---|---|---|---|
| Railway | Railway billing dashboard/export; Railway CLI/API if authenticated and authorized; user-supplied invoice/plan amount | Potentially, only after explicit approval and credentials/session availability | Actual if billing export/invoice; estimated if user provides plan estimate | Billing month or invoice period | Provider billing currency or user-declared currency | service/project, billing period, amount, currency, source reference, measured_at | Manual dashboard export or user-supplied amount first. API/CLI only after approval. Store aggregate amount only. | No repo billing integration observed. Railway deployment evidence exists, but not billing/cost data. |
| Supabase | Supabase dashboard billing/usage export; Supabase Management API if authorized; user-supplied invoice/plan amount | Potentially, but current repo tooling focuses DB/security, not billing | Actual if invoice/export; estimated if user provides plan estimate | Billing month or invoice period | Provider billing currency or user-declared currency | project ref, period, amount, currency, source reference, measured_at | Manual billing export or user-supplied amount first. Do not query production DB for billing. | Supabase DB data proves usage/functionality, not platform cost. Supabase plugin/tooling is not a billing source in this audit. |
| Stripe | Stripe dashboard balance/report export; Stripe API reporting endpoints if approved; existing `stripe_events` for event counts only; user-supplied fee model | Actual if Stripe reporting/export; estimated if fee model/user input | Billing/reporting period | Provider/report currency | gross volume, fee amount or fee model, period, currency, source reference | Manual Stripe report export or user-supplied fee summary first. API only with explicit approval and restricted read scope. | Existing database events show checkout activity, not Stripe fees. Do not touch live payment/refund flows. |
| Resend | Resend dashboard usage/billing export; Resend API if a billing/usage endpoint is available and approved; existing `email_events` counts only; user-supplied plan amount | Potentially, subject to provider API capability and approval | Actual if invoice/export; estimated if user provides plan/usage estimate | Billing month or invoice period | Provider billing currency or user-declared currency | email count, plan/invoice amount, period, currency, source reference | Manual dashboard export or user-supplied amount first. Existing DB can provide sent/delivered event counts as usage support only. | Existing `email_events` prove email activity, not Resend billing cost. |

### Cost Measurement Gaps

- No current evidence of actual Railway billing.
- No current evidence of actual Supabase billing.
- No current evidence of actual Stripe fees.
- No current evidence of actual Resend billing.
- Existing production database rows can support activity volume but cannot prove provider invoices.
- Existing PL20 cost rows with zero values must remain `NOT_MEASURED` unless zero is explicitly proven by provider/user provenance.

## Part B - Cost Snapshot Contract

Each provider cost record must use this exact shape:

| Field | Required | Meaning |
|---|---|---|
| `provider` | yes | One of `railway`, `supabase`, `stripe`, `resend`. |
| `amount` | yes | Decimal amount for the period. Zero is valid only with explicit provenance. |
| `currency` | yes | ISO 4217 currency code, e.g. `USD` or `MXN`. |
| `period_start` | yes | Inclusive period start date/time. |
| `period_end` | yes | Exclusive or inclusive period end; contract must state convention. |
| `actual_or_estimated` | yes | `actual` or `estimated`. |
| `source_type` | yes | `provider_billing`, `provider_plan`, `provider_export`, `provider_api`, `manual_dashboard_capture`, `user_supplied_estimate`, or `internal_usage_support`. |
| `provided_by` | yes | Human/operator/system class, e.g. `user`, `codex_operator`, `provider_api`, `dashboard_export`. No secrets/account IDs. |
| `measured_at` | yes | Timestamp when evidence was collected. |
| `evidence_reference` | yes | Safe file path, provider report ID, dashboard screenshot reference, or written user attestation. No secret URLs. |
| `caveats` | yes | Known limits, estimate assumptions, missing providers, exchange-rate caveat, or tax/fee caveat. |

### Cost Total Combination Rule

Provider states:

- Provider record with complete required fields and provider/export/API/user provenance: `MEASURED`.
- Provider record with amount but missing non-critical detail or estimate uncertainty: `PARTIAL`.
- Provider missing or zero without provenance: `NOT_MEASURED`.

`cost.total`:

- If any required provider is missing: `PARTIAL`.
- If any required provider is `NOT_MEASURED`: `PARTIAL` and cannot satisfy `finalScaleReady`.
- If all four providers are `MEASURED`: `MEASURED`.
- If one or more providers are `PARTIAL` and none are `NOT_MEASURED`: `PARTIAL`.
- `amount = sum(provider.amount)` only across records with explicit provenance.

## Part C - Safe Load Test Plan

Recommended tool: `k6`.

Reason:

- Purpose-built for HTTP load tests.
- Simple declarative stages.
- Captures request counts, rates, latency percentiles, error rate, thresholds, and per-endpoint tags.
- Can be run outside the app without modifying repo dependencies.
- Safer than reusing existing smoke scripts because those scripts include mutating POST operations.

Alternative: Artillery.

- Also acceptable for scenario-based HTTP testing.
- Better if future tests need richer multi-step user flows.
- Requires the same safety restrictions and approval.

Do not execute either tool until ChatGPT Web/user approves target environment, traffic level, and stop conditions.

### Proposed Stage Sequence

No aggressive concurrency is proposed. ChatGPT Web must approve numeric thresholds before execution.

| Stage | Purpose | Suggested Shape | Target Type | Notes |
|---|---|---|---|---|
| baseline | Establish single-user latency and error baseline | 1 virtual user, short duration, repeated read-only requests | Local or staging first | Used to derive future thresholds. |
| small concurrency | Verify low concurrent read-only behavior | small VU count approved by ChatGPT Web | Staging/preview before production | Stop on elevated errors or visible provider strain. |
| moderate concurrency | Validate approved operating envelope | moderate VU count approved only after baseline/small pass | Staging first; production read-only only with approval | Must include Railway/Supabase monitoring. |

### Stop Conditions

Stop immediately if any occur:

- HTTP 5xx above approved threshold.
- Any checkout/payment/email/inventory/admin mutation route is hit.
- p95 or p99 latency exceeds approved abort threshold.
- Error rate exceeds approved abort threshold.
- Railway service restarts, crashes, or shows saturation.
- Supabase connection pressure, pool saturation, or slow query spike is observed.
- Stripe, Resend, or other external side-effect system receives test traffic.
- User reports degraded production behavior.
- Logs show unhandled exceptions, rate-limit cascades, or database errors.

### Must Protect

- Checkout.
- Stripe.
- Emails.
- Inventory.
- Real orders.
- Admin mutations.
- Refunds.
- Webhooks.
- User/account mutation endpoints.

Initial tests should be read-only and unauthenticated whenever possible.

## Part D - Load Test Targets

Endpoint safety matrix:

| Target | Classification | Rationale | Notes |
|---|---|---|---|
| `/` | `SAFE_READ` | Public storefront render route. | Good baseline page target. |
| `/faq` | `SAFE_READ` | Public static/content route used by smoke. | Low DB pressure if static. |
| `/track` | `SAFE_READ` for page shell only | Public route; avoid query patterns with real order tokens. | Do not test real tracking IDs. |
| `/robots.txt` | `SAFE_READ` | Static SEO asset. | Useful control endpoint. |
| `/sitemap.xml` | `SAFE_READ` | Public SEO endpoint. | May exercise product reads; keep low rate initially. |
| `/api/health` | `SAFE_READ` | Health endpoint with Supabase latency check. | Good API baseline, but high volume can create DB health-check pressure. |
| `/api/readiness` | `SAFE_READ` | Runtime readiness check. | Same DB-pressure caveat. |
| `/api/public/store` | `SAFE_READ` | Public store metadata. | Safe initial API target. |
| `/api/public/home` | `SAFE_READ` | Public home data. | Exercises store/products/campaign data. |
| `/api/public/categories` | `SAFE_READ` | Public category data. | Safe if response size is modest. |
| `/api/public/policies` | `SAFE_READ` | Public legal/policy data. | Safe initial route. |
| `/api/products` | `SAFE_READ` | Public catalog API. | Key catalog capacity target. Limit query combinations first. |
| `/api/products/:id` | `SAFE_READ` with known fixture/product id | Product detail API. | Requires approved non-sensitive product id. |
| `/product/:id/...` | `SAFE_READ` with known fixture/product id | Public PDP route. | Good full-page capacity target after baseline. |
| `/api/products/:productId/reviews` | `SAFE_READ` with known product id | Public reviews read. | Safe if product id is approved. |
| `/api/products/:productId/rating` | `SAFE_READ` with known product id | Public rating read. | Safe if product id is approved. |
| `/api/seo/products` | `SAFE_READ` | Public SEO products endpoint. | Watch response size and DB pressure. |
| `/api/public/product-feed` | `SAFE_READ` | Public feed endpoint. | Potentially larger payload; do after smaller targets. |
| Authenticated customer GET routes | `SAFE_WITH_TEST_FIXTURE` | Read-only but require user token. | Use only sandbox/test fixture; avoid real customer data. |
| Admin GET diagnostics/analytics routes | `SAFE_WITH_TEST_FIXTURE` | Read-only but privileged and may expose sensitive aggregates. | Use only staging/admin fixture and aggregate outputs; not first production target. |
| `/api/analytics/events` | `MUTATING_UNSAFE` | Inserts analytics events. | Exclude from capacity test. |
| `/api/ads/events` | `MUTATING_UNSAFE` | Inserts ad events. | Exclude. |
| `/api/experiments/assign` | `MUTATING_UNSAFE` | Assigns experiment events. | Exclude. |
| `/api/contact` | `EXTERNAL_SIDE_EFFECT` | May create contact/email activity. | Exclude. |
| `/api/newsletter/subscribe` | `EXTERNAL_SIDE_EFFECT` | Creates subscription and may trigger email flow. | Exclude. |
| `/api/support/messages` | `MUTATING_UNSAFE` | Creates support records. | Exclude. |
| `/api/retention/abandoned-cart` | `MUTATING_UNSAFE` | Creates abandoned cart records. | Exclude. |
| `/api/orders` | `MUTATING_UNSAFE` | Creates orders and inventory/order records. | Exclude. |
| `/api/checkout` | `EXTERNAL_SIDE_EFFECT` | Creates Stripe checkout session / payment flow. | Explicitly excluded. |
| Stripe/Resend webhooks | `EXTERNAL_SIDE_EFFECT` | Provider event handlers. | Explicitly excluded. |
| Admin POST/PUT/DELETE routes | `MUTATING_UNSAFE` | Change production/admin records. | Exclude unless dedicated sandbox later approved. |
| Refund routes | `EXTERNAL_SIDE_EFFECT` | Stripe/refund mutations. | Explicitly excluded. |
| Email send/resend routes | `EXTERNAL_SIDE_EFFECT` | Sends or queues emails. | Explicitly excluded. |
| Inventory/product mutation routes | `MUTATING_UNSAFE` | Alters catalog/inventory. | Explicitly excluded. |

## Part E - Capacity Metrics Contract

Load-test evidence record:

| Field | Collectible Now? | Source | Notes |
|---|---|---|---|
| `tool` | yes | k6/Artillery result metadata | Tool must be declared. |
| `scenario` | yes | test script/config | Include route mix and environment. |
| `duration` | yes | test config/result | Include ramp-up/ramp-down. |
| `concurrent_users` | yes | test config/result | Must be approved before execution. |
| `requests_total` | yes | tool summary | Per scenario and per endpoint preferred. |
| `requests_per_second` | yes | tool summary | Include average and peak if available. |
| `error_rate` | yes | tool summary | Define HTTP failure logic. |
| `p50_latency_ms` | yes | tool summary | Per endpoint preferred. |
| `p95_latency_ms` | yes | tool summary | Required readiness field. |
| `p99_latency_ms` | yes | tool summary | Required for high-confidence review. |
| `max_latency_ms` | yes | tool summary | Watch for outliers. |

Server/platform metrics:

| Field | Collectible Now? | Source | Notes |
|---|---|---|---|
| `CPU` | unavailable from repo alone | Railway metrics/dashboard/API | Requires Railway dashboard/API access and approval. |
| `memory` | partial | Runtime RSS endpoint/app evidence; Railway metrics for real platform memory | RSS is runtime telemetry only; platform memory needs Railway evidence. |
| `restarts` | partial | Railway logs/dashboard | Requires Railway evidence capture. |
| `HTTP 5xx` | yes/partial | k6 response status + Railway logs | k6 sees client-side 5xx; platform logs validate server view. |

Database metrics:

| Field | Collectible Now? | Source | Notes |
|---|---|---|---|
| `connection pressure` | unavailable from repo alone | Supabase dashboard/pg views if approved | Requires safe read-only DB/metrics access. |
| `slow queries` | partial | Existing admin/performance slow-query endpoints or Supabase tools if approved | Existing internal data may be static/smoke; provider metrics stronger. |
| `query latency` | partial | `/api/health` Supabase latency and load-tool endpoint latency | Health latency is narrow and can add DB pressure. |
| `pool saturation` | unavailable from repo alone | Supabase/connection pool metrics | Requires provider dashboard/API or approved DB metric query. |

## Part F - Pass/Fail Threshold Methodology

Do not invent arbitrary enterprise numbers.

Use this methodology:

1. Baseline-derived:
   - Run approved read-only baseline.
   - Record p50/p95/p99/error rate for each endpoint.
   - Define regression thresholds relative to baseline only after collecting baseline.
2. SLO-derived:
   - If the product has user-facing SLOs, use those as pass/fail thresholds.
   - No current PL20 SLO was found in this audit.
3. Provider-limit-derived:
   - Use Railway plan limits, Supabase plan limits, and provider quotas only after actual plan/billing evidence is supplied.
   - Do not infer plan limits from public pricing pages.

If no current SLO exists, ChatGPT Web must approve thresholds before execution.

Recommended pre-execution threshold inputs:

- Maximum acceptable error rate.
- Maximum acceptable p95 and p99 latency per endpoint class.
- Maximum acceptable Railway CPU/memory saturation.
- Maximum acceptable restart count.
- Maximum acceptable Supabase connection/pool pressure.
- Maximum test duration and max virtual users.

## Part G - Environment Strategy

| Environment | Realism | Risk | Cost | Setup Effort | Use |
|---|---|---|---|---|---|
| Local | Low/medium | Low | Low | Low | Validate k6/Artillery script correctness and route classification. Does not prove production capacity. |
| Railway preview/staging | Medium/high | Medium/low if isolated | Medium | Medium | Preferred first realistic load target if environment exists or is approved. Needs non-production env vars and safe data. |
| Supabase branch/staging DB | Medium/high | Low for production data | Medium | Medium/high | Best for DB pressure testing without production mutation risk. Requires setup/approval. |
| Production read-only | Highest | Medium/high | Potential provider cost/risk | Low setup, high governance | Only after local/staging pass, explicit approval, low read-only load, monitoring, and abort conditions. |

Recommended sequence:

1. Local read-only dry run against local app and local/test DB where available.
2. Railway preview/staging with non-production Supabase branch or staging DB.
3. Production read-only baseline with very low approved concurrency.
4. Production read-only small concurrency only after baseline review.
5. Moderate concurrency only after ChatGPT Web approves thresholds, provider monitoring, and abort plan.

No environment creation is authorized by this plan.

## Prerequisites Before Actual Execution

- ChatGPT Web approves target environment.
- User approves any provider dashboard/API/CLI access.
- Exact endpoint list approved.
- Exact concurrency/duration stages approved.
- Stop conditions approved.
- SLO or baseline-derived thresholds approved.
- Monitoring windows open for Railway and Supabase.
- Confirmation that no test route triggers checkout, Stripe, email, inventory, real order, webhook, refund, or admin mutation side effects.
- Test product IDs, if needed, are approved and non-sensitive.
- Evidence output path and retention rules are approved.
- Production test window is scheduled, if production is used.

## Explicit Approval Required

Require explicit user/ChatGPT Web approval before:

- Calling provider billing APIs.
- Using Railway CLI/API for billing or metrics.
- Using Supabase Management API or DB metrics queries.
- Calling Stripe reporting APIs or exporting live billing data.
- Calling Resend billing/usage APIs.
- Running any load test against production.
- Running any load test above baseline/small concurrency.
- Testing authenticated customer/admin endpoints.
- Creating preview/staging environments.
- Using test fixtures that touch checkout, orders, inventory, email, or admin mutations.
- Recording cost values as `MEASURED`.
- Marking capacity as `MEASURED_AT_SCALE`.

## Final Recommendation

Cost path:

1. Start with manual dashboard export or explicit user-supplied amount for Railway, Supabase, Stripe, and Resend.
2. Store each provider as a separate cost snapshot with source, period, currency, provenance, measured_at, and caveats.
3. Mark `cost.total = MEASURED` only when all four provider records are measured.

Capacity path:

1. Adopt k6 as the first load-test tool unless ChatGPT Web prefers Artillery for scenario flows.
2. Begin with read-only public endpoints.
3. Treat runtime RSS as telemetry only.
4. Require real load results plus Railway/Supabase metrics before changing capacity from `NOT_MEASURED_AT_SCALE`.

Final status:

READY_FOR_CHATGPT_WEB_VALIDATION
