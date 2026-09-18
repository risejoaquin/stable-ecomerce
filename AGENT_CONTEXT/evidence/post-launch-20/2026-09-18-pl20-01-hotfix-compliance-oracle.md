# POST-LAUNCH 20 - PL20-01 Hotfix Compliance Oracle

Date: 2026-09-18
Scope: review/specification only
Source of truth: `AGENT_CONTEXT/evidence/post-launch-20/2026-09-18-pl20-metric-contract-v1.md`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Purpose

This oracle converts Metric Contract V1 into deterministic validation checks for ChatGPT Web to use when reviewing Antigravity's PL20-01 hotfix implementation.

No application code, tests, QA scripts, Supabase schema, production data, Stripe live configuration, or handoff/status files were modified.

## Requirement Matrix

Requirement count: 40

| REQUIREMENT_ID | AREA | REQUIREMENT | EXPECTED IMPLEMENTATION | EXPECTED TEST | PASS CONDITION | FAIL CONDITION | SOURCE SECTION |
|---|---|---|---|---|---|---|---|
| MS-001 | MEASURED STATE | Support `MEASURED`. | Metric state is available and means verified source data or explicit provider/user input with provenance. | Unit/contract assertion for a fully proven metric. | Score/aggregation/readiness allowed only when freshness and provenance exist. | `MEASURED` assigned without source, window, timestamp, or calculation version. | Measured State Enum |
| MS-002 | MEASURED STATE | Support `PARTIAL`. | Metric state represents incomplete evidence or missing required inputs. | Contract test with missing provider or missing load field. | Required readiness gate remains false. | Partial metric satisfies required readiness without explicit optional override. | Measured State Enum |
| MS-003 | MEASURED STATE | Support `NOT_MEASURED`. | Missing/static/smoke-only evidence maps to `NOT_MEASURED` and `score = null`. | Test cost/capacity absent paths. | Metric excluded from readiness aggregation and `finalScaleReady = false` if required. | Not-measured metric receives score or satisfies readiness. | Measured State Enum |
| MS-004 | MEASURED STATE | Support `NOT_APPLICABLE`. | Metric can be excluded only with explicit reason and review date. | Test optional/not-applicable metric path if implemented. | Excluded from aggregation and not treated as pass. | `NOT_APPLICABLE` silently counted as pass. | Measured State Enum |
| MS-005 | MEASURED STATE | Enforce freshness. | Each metric carries freshness threshold and measured timestamp or documented current snapshot source. | Test stale technical evidence marks readiness false. | Stale required evidence fails readiness. | Stale required evidence passes. | Measured State Enum |
| PO-001 | PAID-LIKE ORDERS | Use only real production fields. | Commercial query references `status`, `financial_status`, `paid_at`, `refunded_amount`, `refund_status`, `refunded_at`, `total`, customer aggregate fields, `created_at`. | Test/source assertion that `payment_status` is absent. | No `payment_status` reference in implementation or tests except negative assertion text. | Any production query depends on `payment_status`. | Paid-Like Order Contract |
| PO-002 | PAID-LIKE ORDERS | Include paid timestamp. | `paid_at IS NOT NULL` marks order paid-like unless excluded by conflict rule. | Fixture with `paid_at` present. | paid_like true, gross includes total. | paid order omitted. | Inclusion Rules |
| PO-003 | PAID-LIKE ORDERS | Include reconciled/paid financial status. | `financial_status IN ('paid','reconciled')` marks order paid-like unless excluded by conflict rule. | Fixture with `financial_status = reconciled`. | paid_like true. | reconciled order omitted without conflict. | Inclusion Rules |
| PO-004 | PAID-LIKE ORDERS | Include Spanish/fulfillment paid statuses. | `status IN ('pagado','empacado','enviado','entregado','partially_refunded')` marks paid-like unless excluded. | Fixtures for `pagado` and `enviado`. | paid_like true for each. | paid-like status ignored. | Inclusion Rules |
| PO-005 | PAID-LIKE ORDERS | Exclude canceled/unpaid statuses. | `cancelado`, `pendiente`, `payment_failed`, `inventory_exception` excluded from paid-like revenue. | Fixture with `cancelado`. | paid_like false or conflict marked partial/excluded; gross 0. | canceled order contributes revenue. | Exclusion Rules |
| PO-006 | PAID-LIKE ORDERS | `closed` alone is not paid-like. | `financial_status = closed` does not override canceled/unpaid status and does not prove paid-like alone. | Fixture with closed and no paid indicators. | paid_like false. | closed-only order counted paid. | Exclusion Rules |
| PO-007 | PAID-LIKE ORDERS | Refund logic uses positive amount. | Only positive numeric `refunded_amount` contributes to refunded revenue. | Fixture with refund > 0. | refund contribution equals amount. | non-positive/null refund counted. | Refund Treatment |
| PO-008 | PAID-LIKE ORDERS | Do not treat `refund_status IS NOT NULL` as refund. | `refund_status = none` means no refund evidence. | Fixture with `refund_status = none`, amount 0. | refund contribution 0. | non-null `none` counted as refund. | Refund Treatment |
| CM-001 | COMMERCIAL METRICS | `commercial.orders.total` counts all orders in window. | Count `orders.id` for declared window. | Aggregate test. | Count includes all statuses. | Count filtered to paid-only without label. | Commercial Metrics |
| CM-002 | COMMERCIAL METRICS | `commercial.orders.paid_like` uses paid-like contract. | Count only rows matching paid-like rules. | Mixed fixture test. | Count equals expected paid-like rows. | Canceled/unpaid rows included. | Commercial Metrics |
| CM-003 | COMMERCIAL METRICS | Gross paid-like revenue excludes canceled rows. | Sum `total` only for paid-like rows. | Canceled revenue test. | Gross excludes canceled totals. | Gross uses all-order total. | Commercial Metrics |
| CM-004 | COMMERCIAL METRICS | Refunded revenue sums positive `refunded_amount`. | Sum positive refund amounts. | Partial/full refund tests. | Refund total equals positive refund amounts. | Refunds ignored or `refund_status none` counted. | Commercial Metrics |
| CM-005 | COMMERCIAL METRICS | Net paid-like revenue is deterministic. | `net = gross_paid_like - refunded`. | Net calculation test. | Net matches formula. | Net equals gross when refund exists. | Commercial Metrics |
| CM-006 | COMMERCIAL METRICS | AOV uses paid-like orders only. | `aov = gross_paid_like / paid_like_count`; null when count is 0. | Mixed order fixture. | AOV denominator excludes canceled/unpaid. | AOV divides by all orders. | Commercial Metrics |
| CM-007 | COMMERCIAL METRICS | Customer count is aggregate-only and non-PII. | Count distinct user IDs or emails without returning identifiers. | Response/evidence shape test. | Only count exposed. | Emails/user IDs exposed. | Commercial Metrics |
| TM-001 | TECHNICAL METRICS | Technical gates are status-first. | Build/unit/e2e/smoke/secret/database metrics expose PASS/FAIL status. | Response shape test. | No arbitrary numeric score required. | Static 80/90/100 score used as proof. | Technical Metrics |
| TM-002 | TECHNICAL METRICS | Security blockers use count. | `technical.security_blockers.open_count` is numeric count, not arbitrary score. | Fixture with critical blocker. | Count drives readiness false. | Critical blocker hidden behind passing score. | Technical Metrics |
| CP-001 | CAPACITY | Distinguish runtime telemetry from capacity. | RSS memory stored only as runtime telemetry. | Capacity response test. | Memory does not satisfy load readiness. | RSS memory creates capacity pass/score. | Capacity Metrics |
| CP-002 | CAPACITY | Load test status requires real load evidence. | `capacity.load_test.status` remains `NOT_MEASURED` without controlled load test. | No-load fixture. | score null, readiness false. | Smoke/runtime evidence counted as load test. | Capacity Metrics |
| CP-003 | CAPACITY | Concurrent users require load test. | `capacity.concurrent_users.validated` measured only from load test result. | No-load fixture. | null/not measured. | Hardcoded CCU value accepted. | Capacity Metrics |
| CP-004 | CAPACITY | p95/p99 require sample/scenario. | Latency metrics include load/perf evidence and threshold. | Missing-sample test. | not measured or partial. | Static p95/p99 passes. | Capacity Metrics |
| CP-005 | CAPACITY | DB pressure requires DB metrics under load. | `capacity.db_pressure.status` measured only with DB connection/query/pool evidence. | No DB-pressure fixture. | not measured. | Inferred from ordinary DB connectivity. | Capacity Metrics |
| CO-001 | COSTS | `0 != UNKNOWN`. | Zero amount is measured only with explicit provenance. | Cost fixture with zero/no provenance. | `NOT_MEASURED`. | Zero becomes measured cost by default. | Cost Metrics |
| CO-002 | COSTS | Provider costs require source/period/currency/provenance. | Railway/Supabase/Stripe/email metrics include required fields. | Missing field tests. | Missing field yields `PARTIAL`/`NOT_MEASURED`. | Cost marked measured with incomplete provenance. | Cost Metrics |
| CO-003 | COSTS | `cost.total` depends on providers. | Total is `MEASURED` only when all required provider costs are measured; `PARTIAL` when some exist. | Partial cost test. | Total state matches weakest provider state. | Total measured while provider costs missing. | Cost Metrics |
| IR-001 | INVESTOR READINESS | Investor dimensions use `PASS`, `WARNING`, `NOT_MEASURED`. | No arbitrary investor score is emitted or used. | Response shape test. | Dimensions return allowed statuses only. | Numeric investor score drives readiness. | Investor Readiness Dimensions |
| IR-002 | INVESTOR READINESS | No investment recommendations. | Text remains factual and evidence-based. | Snapshot/content test. | No buy/sell/valuation/return recommendation. | Recommendation or guaranteed outcome appears. | Investor Readiness Dimensions |
| FS-001 | FINAL SCALE READY | Required technical evidence must be current/pass. | Release, smoke, build, unit, e2e, secret, database statuses all required. | Missing technical fixture. | missing/stale/fail => false. | readiness true with missing technical evidence. | Final Scale Ready Contract |
| FS-002 | FINAL SCALE READY | Critical technical/security/risk/debt blockers force false. | Readiness checks all critical blocker categories. | Critical blocker fixture. | finalScaleReady false. | readiness true with critical blocker. | Final Scale Ready Contract |
| FS-003 | FINAL SCALE READY | Commercial core metrics are required. | All commercial core metrics must be `MEASURED`. | Missing commercial metric test. | finalScaleReady false. | readiness true with missing commercial metric. | Final Scale Ready Contract |
| FS-004 | FINAL SCALE READY | Costs cannot be `NOT_MEASURED`. | Required cost metrics must be measured or partial only if ChatGPT Web allows; V1 says not `NOT_MEASURED`. | Missing cost test. | finalScaleReady false. | readiness true with absent costs. | Final Scale Ready Contract |
| FS-005 | FINAL SCALE READY | Capacity load evidence must be measured. | Load status, CCU, p95, DB pressure required. | Missing capacity test. | finalScaleReady false. | readiness true with only smoke/RSS. | Final Scale Ready Contract |
| LR-001 | LEGACY ROWS | Legacy/static rows classified. | Sources `PL20 seed`, `026_post_launch_20`, legacy static `api_final_scale_*` marked `HISTORICAL_STATIC_BASELINE`. | Legacy fixture test. | Row preserved but labeled. | Legacy row treated as active measured evidence. | Legacy Data Contract |
| LR-002 | LEGACY ROWS | Legacy rows excluded from aggregation/readiness. | Active queries filter or exclude historical static baseline rows. | Summary aggregation test. | finalScaleReady ignores legacy rows. | Seed row makes readiness true. | Legacy Data Contract |
| SP-001 | SCORE POLICY | Score only with deterministic formula and measured inputs. | Otherwise `score = null`. | Static score scan/test. | Undocumented static 80/85/88/90/95/100 absent. | Static arbitrary score present. | Score Policy |
| SP-002 | SCORE POLICY | Binary criteria prefer pass/fail. | Technical gates expose status rather than numeric score. | Response shape test. | score null or absent. | binary technical score fabricated. | Score Policy |
| PR-001 | PROVENANCE | Every evidence metric has full provenance fields. | Store/expose source, source_type, window, measured_at, freshness, calculation_version, measured_state, raw_value, derived_value, caveats. | Evidence shape test. | All fields present or explicit partial. | Metric lacks provenance silently. | Provenance Contract |
| PR-002 | PROVENANCE | No secrets/PII in provenance. | Provenance excludes secrets, payment IDs, full emails, addresses, names, tokens, API keys. | Response/evidence scan. | Aggregate-only safe output. | PII/secret-like value exposed. | Provenance Contract |

## Commercial Oracle

Use `total = 100.00` for examples unless otherwise stated.

| Case | Input Shape | Expected paid_like | Gross Contribution | Refund Contribution | Net Contribution | Measured State |
|---|---|---:|---:|---:|---:|---|
| canceled order | `status = cancelado`, no `paid_at`, no paid/reconciled financial status | false | 0.00 | 0.00 | 0.00 | `MEASURED` if fields valid |
| paid_at present | `paid_at` non-null, no exclusion conflict | true | 100.00 | 0.00 | 100.00 | `MEASURED` |
| financial_status=reconciled | `financial_status = reconciled`, no exclusion conflict | true | 100.00 | 0.00 | 100.00 | `MEASURED` |
| status=pagado | `status = pagado` | true | 100.00 | 0.00 | 100.00 | `MEASURED` |
| status=enviado | `status = enviado` | true | 100.00 | 0.00 | 100.00 | `MEASURED` |
| refund amount > 0 | paid-like row, `refunded_amount = 30.00` | true | 100.00 | 30.00 | 70.00 | `MEASURED` |
| full refund | paid-like row, `refunded_amount = 100.00` | true | 100.00 | 100.00 | 0.00 | `MEASURED` |
| partial refund | paid-like row, `refunded_amount = 25.00` | true | 100.00 | 25.00 | 75.00 | `MEASURED` |
| unpaid order | `status = pendiente` or no positive paid indicators | false | 0.00 | 0.00 | 0.00 | `MEASURED` if fields valid |
| conflicting canceled + reconciled order | `status = cancelado`, `financial_status = reconciled` | false unless ChatGPT Web explicitly resolves conflict differently | 0.00 | 0.00 unless refund amount > 0 is separately reported | 0.00 | `PARTIAL` or excluded; ambiguity requires review |

Additional commercial checks:

- `commercial.orders.total` still counts canceled/unpaid rows as total orders.
- `commercial.orders.paid_like` excludes canceled/unpaid rows.
- `commercial.revenue.gross_paid_like` must never use all-order gross total.
- `commercial.aov.paid_like` must divide by paid-like order count only.
- Customer count must expose aggregate count only, never raw emails or user IDs.

## Score Oracle

Expected score behavior:

- Binary technical criteria: `score = null` preferred; status is authoritative.
- Capacity without real load evidence: `score = null`.
- Commercial low-volume: `score = null` unless a deterministic documented formula exists with measured inputs and caveats.
- Investor readiness without cost and capacity evidence: `score = null`.
- Any arbitrary static `80`, `85`, `88`, `90`, `95`, or `100` without documented formula, measured inputs, provenance, calculation version, and caveats: FAIL.
- Null scores must be excluded from numeric aggregation.
- An aggregate score must not hide `NOT_MEASURED` required dimensions.

## Final Scale Ready Oracle

The following conditions must force:

```text
finalScaleReady = false
```

- Missing cost evidence.
- Any required cost metric has `measured_state = NOT_MEASURED`.
- Missing load/capacity evidence.
- `capacity.load_test.status` is not `MEASURED`.
- `capacity.concurrent_users.validated` is missing/null/not measured.
- `capacity.p95_latency_ms` is missing/null/not measured.
- `capacity.db_pressure.status` is missing/not measured.
- Any critical security blocker is open.
- Any critical technical failure is open.
- Any critical open risk exists.
- Any critical open debt exists.
- Technical evidence is stale.
- Production smoke is skipped, stale, missing, or not tied to deployed commit.
- Release/build/unit/e2e/secret/database evidence is missing, stale, or failed.
- Any commercial core metric is missing or not `MEASURED`.
- Paid-like revenue is calculated from all orders instead of paid-like orders.
- Legacy/static rows are included in active readiness aggregation.
- Required dimension is `PARTIAL`, unless ChatGPT Web explicitly marks it optional for current phase.

Conditions necessary for:

```text
finalScaleReady = true
```

- All required technical statuses are current and PASS.
- No critical technical failure exists.
- Critical open security blocker count is 0.
- All commercial core metrics are `MEASURED` and calculated from production fields under this contract.
- All required cost metrics are not `NOT_MEASURED`; for strong readiness they should be `MEASURED` with provider or explicit estimate provenance.
- Capacity load evidence is `MEASURED`, including load test status, validated concurrent users, p95 latency, and DB pressure.
- No critical open risk exists.
- No critical open technical debt exists.
- Active aggregation excludes all `HISTORICAL_STATIC_BASELINE` rows.
- Provenance is present for every readiness-contributing metric.

Do not assume current production can satisfy true. Current expected state under Contract V1 is:

```text
finalScaleReady = false
```

Reasons: cost evidence is not measured, capacity/load evidence is not measured, and current commercial evidence is low-volume even though core aggregate fields exist.

## Legacy Row Oracle

Legacy/static source indicators:

- `PL20 seed`
- `026_post_launch_20`
- `api_final_scale_*` legacy static values

Expected treatment:

- Preserve rows for audit/history.
- Label as `HISTORICAL_STATIC_BASELINE`.
- Exclude from current aggregation.
- Exclude from `finalScaleReady`.
- Exclude from active measured score averages.
- Keep provenance visible so the row cannot be mistaken for current measured evidence.

Accidental inclusion indicators:

- `finalScaleReady = true` when only seeded/static rows exist.
- Summary score changes when seed rows are inserted/deleted.
- Active aggregation includes rows with `metadata.source = PL20 seed`.
- Static values such as 95/92/90 appear as current readiness without formula and measured inputs.
- Legacy `api_final_scale_*` rows without full provenance are counted as `MEASURED`.

## Provenance Oracle

Every current metric should expose or persist:

- `source`
- `source_type`
- `measurement_window_start`
- `measurement_window_end`
- `measured_at`
- `freshness_threshold`
- `calculation_version`
- `measured_state`
- `raw_value`
- `derived_value` if applicable
- `caveats`

Expected result:

- Full implementation: all required fields are present for each readiness-contributing metric.
- Partial implementation: existing JSONB contains some fields but cannot cleanly represent all required values.
- Fail: metric contributes to readiness without provenance.

If existing JSONB cannot hold all values cleanly, mark `PARTIAL IMPLEMENTATION`. Do not recommend or execute schema migration from this oracle task.

Security/PII rule:

- Provenance must not include secrets, payment IDs, full emails, addresses, names, session tokens, API keys, or private provider account identifiers.

## Minimum Test Expectations

Antigravity's implementation should include at least these tests:

1. `payment_status` is not referenced in production commercial query.
2. Canceled orders are excluded from paid-like revenue.
3. Refunds reduce net revenue.
4. AOV uses paid-like orders only.
5. Low volume does not generate arbitrary score.
6. Capacity without load test returns null score / not measured.
7. Zero cost without provenance returns `NOT_MEASURED`.
8. Investor cost readiness is not `PASS` when costs are absent.
9. Legacy seeded rows are ignored by active aggregation.
10. `finalScaleReady` is false when costs are absent.
11. `finalScaleReady` is false when capacity is absent.
12. Null scores are excluded from numeric aggregation.

Additional recommended tests:

- `financial_status = closed` alone is not paid-like.
- `refund_status = none` is not counted as refunded.
- Conflicting `cancelado + reconciled` is excluded or marked partial.
- Provenance shape includes source/window/measured_state/calculation_version.
- PII is not emitted in customer count/provenance.
- Stale technical evidence forces readiness false.
- Critical risk/debt/security blocker forces readiness false.

## Contract Ambiguities For ChatGPT Web

1. Conflicting canceled plus reconciled order:
   - Contract says mark `PARTIAL` or exclude unless extended.
   - Oracle expects exclusion for revenue and flags ambiguity for ChatGPT Web.
2. Cost readiness:
   - Contract says required costs must be "not `NOT_MEASURED`"; strong readiness should require `MEASURED`.
   - ChatGPT Web should decide whether `PARTIAL` cost can ever satisfy PL20 or only pre-readiness review.
3. Commercial low-volume:
   - Contract permits measured metrics with caveats, but does not define sample-size thresholds.
   - ChatGPT Web should define when low volume is `WARNING` versus readiness-blocking.
4. `NOT_APPLICABLE` provider dimensions:
   - Contract allows exclusion only when explicitly optional or replaced.
   - ChatGPT Web should decide whether any PL20 cost/capacity provider can be not applicable.
5. Legacy `api_final_scale_*` rows:
   - Contract names legacy static values, but active API rows may become valid if generated under V1 with full provenance.
   - Detection should use provenance completeness and calculation version, not only endpoint prefix.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Requirement count: 40

Blocker conditions:

- missing cost evidence
- missing load/capacity evidence
- critical security blocker
- critical technical failure
- critical open risk
- critical open debt
- stale technical evidence
- missing commercial core metrics
- legacy/static row inclusion
- arbitrary score without deterministic measured formula

Minimum tests: 12 required, 7 additional recommended

Exact expected current `finalScaleReady`: `false`

Primary ambiguities for ChatGPT Web: conflict resolution for canceled/reconciled orders, whether partial costs can ever satisfy PL20, commercial sample-size threshold, not-applicable provider policy, and distinguishing legacy `api_final_scale_*` rows from future V1-compliant rows.
