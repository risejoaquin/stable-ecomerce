# POST-LAUNCH 20 (PL20-03D): Remote Capacity Baseline Readiness Assessment

**Date:** 2026-09-19
**Phase:** POST-LAUNCH 20 (PL20-01 PASS / CLOSED; PL20-02 PASS / CLOSED; PL20-03A PASS / CLOSED; PL20-03B PASS / CLOSED; PL20-03C PASS / CLOSED; PL20-03 ACTIVE; PL20-03D COMPLETE; PL21 NOT STARTED)
**Evaluated Commit SHA:** `4397742e7bcca890768f1c58ce8e68418a7f6ff6`
**Recommendation State:** **`NO_ISOLATED_REMOTE_ENVIRONMENT`**
**`finalScaleReady`:** Strictly `false`

---

## 1. Executive Assessment & Recommendation

A forensic discovery of current remote infrastructure across Railway, Supabase, GitHub Actions, and Stripe was conducted to determine whether a safe, isolated remote/staging capacity baseline could be executed.

### Recommendation State
```text
NO_ISOLATED_REMOTE_ENVIRONMENT
```

### Core Fact
There is currently **no non-production, staging, or preview remote environment** provisioned for this repository:
1. **Railway:** Only one environment exists in project `heroic-solace`: `production` (`b4af6a5d-c5fb-45bb-b0c6-b5c13ebb1997`). There are no staging or preview environments.
2. **Supabase:** Only one remote database project exists: `dporfgsbwsyqzmlnqrug` (the live production database).
3. **GitHub Actions:** All deployment records target `production` (`https://selfcaresinners.com`).
4. **Stripe:** The CLI and linked account are configured strictly in live mode (`SolidBit`).
5. **Safety Directive Enforced:** In strict accordance with instructions, **no new infrastructure was created, no configuration was altered, no load test was executed against any remote host, and production was not touched**.

---

## 2. Task 1: Discovery of Current Remote Environments

### 2.1 Railway Environment Inventory
Executed read-only query `railway environment list --json`:
```json
{
  "environments": [
    {
      "id": "b4af6a5d-c5fb-45bb-b0c6-b5c13ebb1997",
      "name": "production",
      "isEphemeral": false,
      "isLinked": true,
      "restricted": false,
      "createdAt": "2026-07-09T20:56:53.235+00:00",
      "updatedAt": "2026-07-09T20:56:54.920+00:00"
    }
  ]
}
```
- **Total Environments:** 1 (`production`).
- **Railway Preview Environments:** None.
- **Railway Staging Environments:** None.

### 2.2 Railway Services Inventory
Executed read-only query `railway service list --json` on project `heroic-solace`:
- `stable-ecomerce` (`262ce4a4-ea70-4b0a-886d-511eb13d5d27`): linked to repo `risejoaquin/stable-ecomerce`, domain `https://selfcaresinners.com`, status `● Online`.
- `FULL-METAL-CASH`, `cooperative-connection`, `solidbit`: separate unrelated projects sharing the account.
- No secondary or staging service exists for `risejoaquin/stable-ecomerce`.

### 2.3 Supabase Project Inventory
- File: `supabase/.temp/project-ref` -> `dporfgsbwsyqzmlnqrug` (production).
- File: `supabase/.branches/_current_branch` -> `main`.
- Remote projects: Exactly 1 (`dporfgsbwsyqzmlnqrug`).
- Isolated staging/test database: None.

### 2.4 GitHub Actions Deployments
Queried repository deployment records via `gh api repos/risejoaquin/stable-ecomerce/deployments`:
- All deployments are for `environment: "production"` or `heroic-solace / production`.
- Zero preview or staging deployment pipelines exist in `.github/workflows`.

---

## 3. Task 2: Environment Classification

| Discovered Target | URL / Identifier | Classification | Notes |
|---|---|---|---|
| Railway Production Service | `https://selfcaresinners.com` | `PRODUCTION` | Live customer-facing storefront. Not approved for load baseline. |
| Railway Staging | (none) | `UNKNOWN` / Not Provisioned | Does not exist. |
| Railway Preview | (none) | `UNKNOWN` / Not Provisioned | Does not exist. |
| Supabase Project | `dporfgsbwsyqzmlnqrug` | `PRODUCTION` | Live production database. |

> **Classification Rule Enforced:** A remote target is NOT safe merely because its URL differs from production. If an ephemeral or preview service were created without isolated sandbox credentials, it would classify as `PREVIEW_USES_PRODUCTION_BACKEND` and be immediately disqualified.

---

## 4. Task 3: Backend & Provider Isolation Analysis

For any hypothetical future staging or preview candidate, backend isolation requires:

| Component | Production Configuration | Staging / Preview Requirement | Current Status |
|---|---|---|---|
| Supabase DB | `dporfgsbwsyqzmlnqrug` | Separate sandbox project or isolated DB | Not configured (only production exists) |
| Supabase Service Role | Production key | Staging-only non-privileged or sandbox key | Not configured |
| Stripe | Live account `acct_1TLawpEKfBRabUZ0` (`SolidBit`) | `sk_test_...` sandbox key | Not configured |
| Resend | Production sending domain & API key | Test sandbox key or sink | Not configured |
| Production DB Data | Production tables & customer records | Empty or synthetic test seed | Not isolated |

**Verdict:** Any preview created today under current Railway project settings would inherit production backend variables, making it `PREVIEW_USES_PRODUCTION_BACKEND` (`NOT APPROVED FOR LOAD BASELINE`).

---

## 5. Task 4: SAFE_READ Route Policy

The approved target routes for capacity baselining remain strictly:
- `/`
- `/api/health`
- `/api/readiness`
- `/api/public/store`
- `/api/public/home`
- `/api/public/categories`
- `/api/products`

- **Mutations Excluded:** Checkout, orders, payments, refunds, admin actions, newsletter/contact emails, webhooks.
- **k6 Execution:** Zero remote k6 runs executed.
- **Manual GET Inspection:** Per directive, manual GET inspection is permitted only if the target is clearly non-production. Because no non-production target exists, no remote probe was run.

---

## 6. Task 5: Railway Observability & Monitoring Availability

Inspected capabilities of Railway platform and CLI (`railway metrics --json`):

| Metric / Dimension | Availability via Railway CLI | Availability via Railway Dashboard | Notes / Precision |
|---|---|---|---|
| **CPU Usage** | **Available** (`--cpu`, `--json`) | Available | Reports `current`, `average`, `max`, `limit` (3.0 vCPU), `utilization_pct`. Raw time-series supported. |
| **Memory Usage** | **Available** (`--memory`, `--json`) | Available | Reports `current_mb`, `average_mb`, `max_mb`, `limit_mb` (~4 GB), `utilization_pct`. Raw time-series supported. |
| **Container Restarts** | **Available** (service status & logs) | Available | Tracked via `replicas.crashed`, `replicas.exited`, and deployment restart events in `railway logs`. |
| **Replicas** | **Available** (`railway service list --json`) | Available | Reports `configured: 1`, `running: 1`, `crashed: 0`, `exited: 0`. |
| **Request Errors (HTTP)** | **Available** (`--http`, `--json`) | Available | Reports `2xx`, `3xx`, `4xx`, `5xx`, `error_rate`, latency percentiles (`p50`, `p90`, `p95`, `p99`). |
| **Deployment Events** | **Available** (`railway deployment list --json`) | Available | Reports deployment ID, status (`SUCCESS`, `REMOVED`), timestamps. |
| **V8 Heap Internals** | Unavailable via CLI | Unavailable | OS-level cgroup memory only; requires in-app APM for V8 heap detail. |

---

## 7. Task 6: Supabase Monitoring Availability (Free Tier)

| Metric / Dimension | Availability on Supabase Free Tier | Observation Method | Limitation / Fact |
|---|---|---|---|
| **Connection Count / Pool Pressure** | Partial / Dashboard only | Supabase Dashboard "Database Health" | Free tier has strict connection limits (~60 direct). No automated CLI metric scraping without custom SQL on `pg_stat_activity`. |
| **Query Latency** | Partial | App-level probe (`/api/readiness`) & Dashboard Reports | `/api/readiness` measures ping latency (`latencyMs`). Deep latency trends require Pro plan or `pg_stat_statements`. |
| **Slow Queries** | Partial | Supabase Dashboard Reports | Dashboard shows top slow queries; no real-time webhook or alerting on Free tier. |
| **Pool Behavior (Supavisor)** | Partial | Dashboard Pooler tab | PgBouncer/Supavisor stats visible in web UI only. |
| **Database Errors** | Available (1-day retention) | Postgres logs in Supabase Dashboard; in-app `operational_events` | 1-day log retention on Free plan (vs 7 days on Pro). |

---

## 8. Task 7: Proposed Parameters for a Future Isolated Staging Baseline

> **Notice:** These are proposals for a hypothetical future isolated staging environment only. They are NOT approved for production, and NO test was executed.

- `PL20_ENVIRONMENT`: `staging`
- `PL20_STAGE`: `STAGING_BASELINE_01`
- `APPROVED_VUS`: `1` (conservative 1-to-1 comparison against local baseline), stepping to `2` only after 1 VU passes.
- `APPROVED_DURATION`: `30s`
- `APPROVED_SLEEP_SECONDS`: `1`
- `TARGET_ROUTES`: Exact 7 `SAFE_READ` routes.

---

## 9. Task 8: Hard Abort Stop Conditions

If a remote capacity test is authorized in the future on an isolated target, execution must abort immediately upon any of the following:

1. **HTTP 5xx Spike:** Any systemic 5xx on non-readiness routes (> 1% error rate) or any unhandled 500 error.
2. **App Container Restart:** Any container crash, exit, or deployment restart (`replicas.crashed > 0`).
3. **CPU Saturation:** Container CPU utilization > 80% (sustained > 2.4 vCPU).
4. **Memory Saturation:** Container memory utilization > 85% (> 3.4 GB) or sustained steep upward trajectory.
5. **Database Connection Errors:** Any `remaining connection slots are reserved`, connection pool exhaustion, or DB timeout.
6. **Unexpected Data Mutation:** Any database insert, update, or delete during the test window.
7. **External Provider Calls:** Any outbound call to Stripe API (`api.stripe.com`) or Resend API (`api.resend.com`).
8. **Customer Impact:** Any degradation of production traffic or customer-facing operations.

---

## 10. Task 9: Durable Operating Cost State

Facts regarding operating cost dimensions are strictly preserved:

| Provider | Current Evaluated Cost | Provenance / State | Attributable Total Impact |
|---|---|---|---|
| **Railway** | 192 MXN across account | `PARTIAL` (shared account across 4 services, unallocated) | Attributable amount is `null` |
| **Supabase** | 0 MXN | `MEASURED` (current Free tier) | 0 MXN |
| **Stripe** | ~2.9% + 3 MXN per transaction | `PARTIAL` (variable fees only, 0 MXN fixed) | Attributable amount is `null` |
| **Resend** | 0 MXN | `MEASURED` (current Free tier) | 0 MXN |
| **`COST_MEASURED`** | **`false`** | Strictly preserved | `total_estimate` is `null` |

---

## 11. Final Summary & Governance Bounds

- **Recommendation:** **`NO_ISOLATED_REMOTE_ENVIRONMENT`**
- **Action Taken:** Read-only inspection and documentation only.
- **Prohibitions Enforced:**
  - NO load test executed against any remote host.
  - NO staging infrastructure created.
  - NO configuration modified in Railway, Supabase, Stripe, or Resend.
  - NO changes to production.
  - PL20-03 remains ACTIVE.
  - PL21 NOT STARTED.
  - `finalScaleReady` strictly remains `false`.
