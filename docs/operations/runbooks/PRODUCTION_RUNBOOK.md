# Production Runbook — Selfcare Sinners Platform

**Document ID**: `RUNBOOK-PROD-001`
**Domain**: Observability & Operations
**Audience**: On-Call Engineers, Site Reliability Engineers, Platform Operations
**Related Findings**: [`AUD-OBS-012`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce-Orchestrator/results/repo-audit/AUDIT_FINDINGS_REGISTER.md#aud-obs-012), [`AUD-SEC-002`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce-Orchestrator/results/repo-audit/AUDIT_FINDINGS_REGISTER.md#aud-sec-002)
**Status**: Authoritative Active Runbook

---

## 1. System Architecture Overview

The Selfcare Sinners production e-commerce platform runs as a unified full-stack Node.js Express service hosting both the React single-page application (SPA) and REST API endpoints:

- **Hosting Platform**: Railway Container Runtime (Linux x86_64, Node.js 22 LTS).
- **Primary Database**: Supabase Hosted PostgreSQL with Row Level Security (RLS) and connection pooling.
- **Payment Gateway**: Stripe API & Webhook Ingest (`/api/webhooks/stripe`).
- **Transactional Email**: Resend API & Webhook Ingest (`/api/webhooks/resend`).
- **Telemetry & Error Tracking**: Sentry SDK (browser tracing & backend exception tracking) and structured JSON logging via Pino.

---

## 2. Routine Operational Health Checks

### 2.1 Daily Verification Checklist
Execute daily during business morning standup:

1. **Verify Ingress & Container Health**:
   ```bash
   curl -s -i https://<production-domain>/api/health
   ```
   *Expected Response*: HTTP 200 with `{ "status": "ok", "service": "Selfcare Sinners ecommerce", "commit": "<git-sha>" }`.

2. **Verify Database Readiness & Connectivity**:
   ```bash
   curl -s -i https://<production-domain>/api/readiness
   ```
   *Expected Response*: HTTP 200 with `{ "status": "ready", "database": "connected" }`.

3. **Inspect Admin Diagnostics Portal**:
   - Access `/api/admin/diagnostics` (requires authenticated Admin JWT or session).
   - Verify `status: "ok"`.
   - Confirm:
     - `unresolvedStripeEvents === 0`
     - `negativeStockProducts === 0`
     - `recentOperationalErrors === 0`

4. **Review Unresolved Stripe Webhook Events**:
   - Access `/api/admin/diagnostics/stripe`.
   - Ensure `unresolvedCount === 0`.
   - If any events have `error_message`, follow [Section 4.1](#41-paid-order-not-finalized--stripe-webhook-processing-failure).

5. **Review Stale Pending Orders**:
   - Access `/api/admin/diagnostics/orders`.
   - Verify `pendingOrdersOver24h === 0`.

### 2.2 Weekly Operational Checklist
1. **Automated Smoke Validation**:
   Execute the fast QA suite against staging/production:
   ```powershell
   ./scripts/qa/validate-fast.ps1
   ```
2. **Supabase Backup Review**:
   - Log into the Supabase Dashboard -> Project Settings -> Database -> Backups.
   - Verify daily Point-in-Time Recovery (PITR) and scheduled snapshots are active.
3. **Railway Deployment Review**:
   - Review deployment metrics (CPU, RAM, container restart count).
   - Container RAM should remain comfortably below 80% quota.
4. **Stripe & Resend Webhook Delivery**:
   - Review Stripe Dashboard -> Developers -> Webhooks -> Event Delivery logs for 4xx/5xx spikes.
   - Review Resend Dashboard -> Webhooks for delivery success rates (>99.5%).

---

## 3. Log Querying & Diagnostic Troubleshooting Protocol

The server outputs structured JSON logs via Pino. Incoming request headers (`Authorization`, `Cookie`, `Stripe-Signature`, `X-Guest-Cart-Token`) and sensitive body parameters (`password`, `token`, `cardNumber`, `cvc`) are automatically redacted with `[REDACTED]` to prevent credential leaks.

### 3.1 Railway Log Search Filters
When querying Railway container logs:

- **Filter by Request Correlation ID**:
  ```text
  "requestId":"<target-request-id>"
  ```
- **Filter by HTTP Error Responses (4xx/5xx)**:
  ```text
  res.statusCode>=400
  ```
- **Filter by Unhandled Server Exceptions**:
  ```text
  "Unhandled Error"
  ```
- **Filter by Order / Checkout Failures**:
  ```text
  "checkout" OR "order" AND "error"
  ```

---

## 4. Top 5 Operational Failure Scenarios & Mitigations

### 4.1 Paid Order Not Finalized / Stripe Webhook Processing Failure
- **Symptoms**: Customer reports being charged by Stripe, but order status remains `pending` or confirmation email was not sent.
- **Root Cause**: Transient network failure during webhook delivery, webhook signature verification error, or database lock contention during inventory decrement.
- **Triage Steps**:
  1. Query `stripe_events` table for the event:
     ```sql
     SELECT id, type, processed_at, error_message, created_at
     FROM stripe_events
     WHERE (event_data->'object'->>'id' = '<stripe_session_id>'
        OR event_data->'object'->>'payment_intent' = '<payment_intent_id>');
     ```
  2. Inspect Railway logs for the event ID:
     ```text
     "stripe-event" AND "<event-id>"
     ```
  3. Verify that `finalize_paid_order` PostgreSQL RPC completed without throwing `insufficient_inventory`.
- **Mitigation Procedure**:
  1. If payment is confirmed in the Stripe Dashboard, trigger a **Retry Webhook** from the Stripe Dashboard.
  2. If the webhook succeeds, order status updates to `paid` and confirmation email dispatches automatically.
  3. If manual reconciliation is required, execute the administrative finalization tool in Admin Console with operator audit notes.

### 4.2 Negative Inventory / Inventory Concurrency Exception
- **Symptoms**: `negativeStockProducts > 0` reported on `/api/admin/diagnostics`.
- **Root Cause**: High-concurrency checkout race conditions where multiple customers checked out the last remaining unit before database row lock completed.
- **Triage Steps**:
  1. Identify affected product IDs:
     ```sql
     SELECT id, title, stock, variants
     FROM products
     WHERE stock < 0;
     ```
  2. Inspect recent `order_items` for the impacted product:
     ```sql
     SELECT id, order_id, product_id, quantity, created_at
     FROM order_items
     WHERE product_id = '<product_id>'
     ORDER BY created_at DESC LIMIT 10;
     ```
- **Mitigation Procedure**:
  1. Immediately set product status to `archived` or stock to `0` via Admin Catalog to prevent further overselling.
  2. Contact the impacted customer(s) to offer an alternative item or execute a full refund via Stripe.
  3. Record the stock correction in inventory audit logs.

### 4.3 Supabase Connection Pool Exhaustion / High Latency
- **Symptoms**: `/api/readiness` fails or response time exceeds 2000ms; logs show `PostgresConnectionError` or `pool_timeout`.
- **Root Cause**: Unbounded `SELECT` queries without `.limit()`, leaked client connections, or unexpected traffic spike exhausting PgBouncer pool.
- **Triage Steps**:
  1. Check active database connections in Supabase Dashboard -> Database -> Connection Pooler.
  2. Inspect slow queries in PostgreSQL pg_stat_activity:
     ```sql
     SELECT pid, now() - query_start AS duration, query, state
     FROM pg_stat_activity
     WHERE state != 'idle'
     ORDER BY duration DESC;
     ```
- **Mitigation Procedure**:
  1. Terminate long-running blocked queries if necessary (`SELECT pg_terminate_backend(<pid>);`).
  2. Restart the Railway container instance to cleanly drain stale client sockets.
  3. Verify that `/api/readiness` latency returns to nominal (<50ms).

### 4.4 Resend Email Delivery Failures or Suppression Spikes
- **Symptoms**: Customers report missing verification or order confirmation emails; Resend dashboard shows dropped events.
- **Root Cause**: Spam score penalty, invalid customer recipient address, or Resend API key rate-limiting.
- **Triage Steps**:
  1. Query `email_events` table for failed dispatches:
     ```sql
     SELECT id, recipient, template_id, status, error, created_at
     FROM email_events
     WHERE status = 'failed'
     ORDER BY created_at DESC LIMIT 20;
     ```
  2. Inspect Resend Dashboard -> Logs for delivery bounce codes (e.g. 550 mailbox unavailable).
- **Mitigation Procedure**:
  1. For soft bounces or API errors, trigger batch re-delivery via the Admin Email Center (`/admin/email-center`).
  2. For invalid emails, update customer email on the order record and resend.

### 4.5 Sentry Error Spikes / Quota Warning
- **Symptoms**: Sentry email alerts of rapid quota consumption (>80% monthly quota).
- **Root Cause**: Infinite loop in client React re-rendering, unhandled Promise rejection loop, or automated bot scanning non-existent routes.
- **Triage Steps**:
  1. Check Sentry Issues dashboard to identify the top error fingerprint.
  2. Determine whether error originates from client browser or server runtime.
- **Mitigation Procedure**:
  1. If client component loop: Deploy quick hotfix or disable problematic UI widget via feature flag.
  2. If log volume is flooding: Temporarily configure `LOG_LEVEL=warn` on Railway to suppress debug/info cascades.

---

## 5. Escalation & Contact Directory

| Role | Contact | Availability | Escalation Threshold |
| :--- | :--- | :--- | :--- |
| **Primary On-Call** | Platform Engineering Lead | 24/7 Pager | SEV1 Outage, Payment Failure |
| **Secondary On-Call** | Tech Lead / Repository Maintainer | Business Hours | SEV2 Degraded, Unresolved SEV1 |
| **Stripe Support** | https://support.stripe.com | 24/7 Portal | Stripe API Outage, Payout Issues |
| **Supabase Support** | https://supabase.com/dashboard/support | 24/7 Portal | Database Unavailability |
| **Railway Support** | https://railway.com/help | Priority Ticket | Container / Edge Routing Outage |
