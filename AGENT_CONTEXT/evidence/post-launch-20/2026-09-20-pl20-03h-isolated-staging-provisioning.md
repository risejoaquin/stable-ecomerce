# POST-LAUNCH 20 (PL20-03H): Isolated Staging Provisioning Evidence

**Date:** 2026-09-20
**Phase State:** PL20-01..PL20-03G PASS / CLOSED; PL20-03 ACTIVE; PL20-03H PROVISIONED / COMPLETE; PL21 NOT STARTED
**Evaluated Main Commit:** `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
**Deployed Staging Commit:** `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
**`COST_MEASURED`:** Strictly `false` (zero rows persisted)
**`finalScaleReady`:** Strictly `false`
**Result:** `READY_FOR_CHATGPT_WEB_VALIDATION`

---

## 1. Executive Summary & Infrastructure Overview

In accordance with the PL20-03F staging architecture and PL20-03G preflight determinations, phase **PL20-03H** provisioned a completely isolated, standalone staging environment without cloning production or inheriting production credentials.

| Resource / Component | Identity / Reference | Configuration / Status | Isolation Verification |
|---|---|---|---|
| **Railway Project** | `selfcare-sinners-staging` (`d1321352-aa85-4cdd-9f7a-aec01f7c38de`) | Dedicated independent project in workspace `SolidBitsMx` | 100% isolated; zero variable inheritance from production (`heroic-solace`). |
| **Railway Service** | `web-staging` (`1ac0933c-1361-4f1f-9794-0a23db2279cf`) | Connected to `risejoaquin/stable-ecomerce` (`main` branch) | Deployed SHA: `04effaf0ddf7ce72e7b374718428f1849c4e32c0`. Status: `SUCCESS`. |
| **Staging Public Domain** | `https://web-staging-production-8fb1.up.railway.app` | Generated service domain on port 3000 | Configured as `APP_URL`, `API_URL`, `VITE_APP_URL`, `VITE_API_URL`. Never uses `selfcaresinners.com`. |
| **Supabase Staging Database** | `gecdtigvmsvsmhvnlarh` (`selfcare-sinners-staging`) | Dedicated project in region `us-east-1` | Schema and synthetic seed APPLIED. Zero customer PII. Production ref `dporfgsbwsyqzmlnqrug` strictly absent. |
| **Runtime Environment** | `NODE_ENV=production` | Serving compiled static bundle from `dist/` | Avoids Vite dev server middleware in `server.ts:11871`. Preserves capacity fidelity. |
| **Stripe Gateway** | Test Mode (`sk_test_...`) | Placeholder test key configured | Zero live Stripe keys. Zero live payment objects. |
| **Email Service** | Mock Mode (`EMAIL_ALLOW_MOCKS=true`) | Internal mock sink (`mock-${eventId}`) | `RESEND_API_KEY` placeholder. Zero outbound emails sent. |

---

## 2. Preflight & Project Creation (Tasks 1, 2)

- **Preflight Verification:**
  - `git HEAD`: `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
  - `origin/main`: `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
  - Production Railway project `heroic-solace` (`2ee53291-c0b1-4859-9ae6-8e331d1f6435`) completely untouched.
- **Dedicated Project Creation:**
  - Executed: `railway init --name selfcare-sinners-staging --workspace SolidBitsMx --json`
  - Output: `{"id":"d1321352-aa85-4cdd-9f7a-aec01f7c38de","name":"selfcare-sinners-staging"}`
  - Zero shared variables inherited.
- **Billing Impact Inspection:**
  - `railway usage`: Current bill $3.73 USD, estimated $7.15 USD, soft limit not set, hard limit not set, `over limit: no`.
  - Staging project created under existing pay-as-you-go workspace without requiring plan changes or triggering billing approval warnings.

---

## 3. Service Connection & Domain Configuration (Tasks 3, 4)

- **Service Connection:**
  - Executed: `railway add --repo risejoaquin/stable-ecomerce --branch main --service web-staging --json`
  - Service ID: `1ac0933c-1361-4f1f-9794-0a23db2279cf`
- **Domain Generation:**
  - Executed: `railway domain --service web-staging --json`
  - Staging Public URL: `https://web-staging-production-8fb1.up.railway.app`
- **Runtime Mode:**
  - Configured `NODE_ENV=production` in compliance with Task 4 and PL20-03G findings.

---

## 4. Staging Credentials & Variable Configuration (Tasks 5, 6, 7, 8)

All variables were configured directly on `web-staging` via `railway variable set` with `--skip-deploys`:

1. **Supabase Staging Credentials:**
   - Keys fetched directly from project `gecdtigvmsvsmhvnlarh` via Supabase CLI (`--reveal --output json`).
   - `SUPABASE_URL`: `https://gecdtigvmsvsmhvnlarh.supabase.co`
   - `SUPABASE_ANON_KEY`: Staging anon JWT (`eyJ...`, 208 chars).
   - `SUPABASE_SERVICE_ROLE_KEY`: Staging service_role JWT (`eyJ...`, 219 chars).
   - **Strict Abort Verification:** Verified zero presence of production ref `dporfgsbwsyqzmlnqrug` across all Supabase variables.
2. **Stripe Test Mode:**
   - `STRIPE_SECRET_KEY`: `sk_test_placeholder_awaiting_operator_key` (strictly non-live; satisfies startup check).
   - `STRIPE_WEBHOOK_SECRET`: `whsec_mock_staging_only`.
   - Missing Operator Action Noted: Local Stripe CLI was authenticated exclusively to live context (`acct_1TLawpEKfBRabUZ0`). Real `sk_test_...` key from Stripe Dashboard requires operator injection if checkout/webhook events are tested in staging.
3. **Resend Mock Mode:**
   - `EMAIL_ALLOW_MOCKS`: `true`.
   - `RESEND_API_KEY`: `re_mock_staging_only` (satisfies startup check while `EmailService` redirects sends to mock sink).
   - `RESEND_WEBHOOK_SECRET`: `whsec_mock_staging_only`.
   - `EMAIL_FROM`: `noreply@web-staging-production-8fb1.up.railway.app`.
4. **General Staging Variables:**
   - `JWT_SECRET`: Unique 64-hex cryptographically random string (`e1bd332...`).
   - `PRIMARY_STORE_SLUG`: `selfcare-sinners`.
   - `ADMIN_EMAIL`: `admin@staging.local`.
   - `APP_URL` / `API_URL` / `VITE_APP_URL` / `VITE_API_URL`: `https://web-staging-production-8fb1.up.railway.app`.

---

## 5. Deployment & Runtime Verification (Task 9)

- Executed: `railway redeploy -s web-staging -y --from-source --json`
- **Deployment Status:** `SUCCESS` (`c8f1bb38-37c3-4c42-a411-1f83a6612ecd`)
- **Deployed Commit:** `04effaf0ddf7ce72e7b374718428f1849c4e32c0`
- **Container Log Evidence:**
  ```text
  Starting Container
  [INFO] Server running on port 3000 time=1789958595244 pid=25 hostname="016422a9fa70"
  ```

---

## 6. Health & Readiness Probe Results (Tasks 10, 11)

### `GET /api/health`
```json
{
  "status": "ok",
  "service": "selfcare-sinners-web",
  "environment": "production",
  "version": "04effaf0ddf7ce72e7b374718428f1849c4e32c0",
  "uptimeSeconds": 333,
  "timestamp": "2026-09-21T02:48:47.433Z",
  "requestId": "6c3ac1a3-048b-438d-ab84-4f90d1457948"
}
```
- Status: **HTTP 200 OK**
- Deployed SHA: `04effaf0ddf7ce72e7b374718428f1849c4e32c0` (matches HEAD and origin/main)
- Environment: `"production"` (expected under `NODE_ENV=production` build fidelity)

### `GET /api/readiness`
```json
{
  "status": "ready",
  "checks": {
    "env": {
      "ok": true,
      "missing": []
    },
    "supabase": {
      "ok": true,
      "latencyMs": 405,
      "error": null
    },
    "stripe": {
      "ok": true
    },
    "email": {
      "ok": true
    }
  },
  "timestamp": "2026-09-21T02:48:47.982Z",
  "requestId": "21b4b714-283c-47fd-b5f5-eb97ecc43ec9"
}
```
- Status: **HTTP 200 OK**
- Status: `"ready"`
- Supabase check: `ok: true`, latency 405ms against `gecdtigvmsvsmhvnlarh.supabase.co`.

---

## 7. SAFE_READ Routes Verification (Task 12)

Manual GET inspection against `https://web-staging-production-8fb1.up.railway.app` (zero load test executed):

| Route | HTTP Status | Response Summary |
|---|---|---|
| `GET /` | `200 OK` | HTML storefront rendered; title `"Selfcare Sinners"`, production bundle assets served from `/dist`. |
| `GET /api/health` | `200 OK` | `{"status":"ok","version":"04effaf0ddf7ce72e7b374718428f1849c4e32c0"}`. |
| `GET /api/readiness` | `200 OK` | `{"status":"ready","checks":{"supabase":{"ok":true}}}`. |
| `GET /api/public/store` | `200 OK` | Store: `Selfcare Sinners Staging` (`11111111-1111-4111-8111-111111111111`), slug `selfcare-sinners`. |
| `GET /api/public/home` | `200 OK` | Returns 3 synthetic products (`Synthetic Serum A`, `Synthetic Cream B`, `Synthetic Cleanser C`). |
| `GET /api/public/categories` | `200 OK` | Returns category `Staging Category` (`staging-category`). |
| `GET /api/products` | `200 OK` | Returns total 3 synthetic products from staging database. |

Zero mutations executed. Zero redirect loops to admin/checkout/payment routes.

---

## 8. Cross-Talk Verification (Task 13)

- **Production Supabase (`dporfgsbwsyqzmlnqrug`):** 0 queries, 0 writes, 0 connections from staging. Staging database ref is `gecdtigvmsvsmhvnlarh`.
- **Production Stripe:** 0 charges, 0 customers, 0 payment intents created. Live keys are strictly absent from staging.
- **Production Resend:** 0 emails sent. `EMAIL_ALLOW_MOCKS=true` enforced mock routing.
- **Production Railway (`heroic-solace`):** Project configuration, services, and environments remained 100% untouched.

---

## 9. State Invariants Maintained

- `COST_MEASURED`: Strictly `false`.
- `finalScaleReady`: Strictly `false`.
- Capacity load testing (k6): **NOT EXECUTED**.
- Phase State: PL20-03 ACTIVE; PL21 NOT STARTED.
