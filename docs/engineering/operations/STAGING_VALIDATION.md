# Staging Environment Validation & Regression Protocol

**Document ID**: `STG-VAL-001`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Authority**: Mandatory Staging Verification Specification
**Target Release**: Client 01 v1.0
**Parent Epic**: `CCP-35` / `CCP-44`

---

## 1. Objective & Invariant

The purpose of the Staging Validation Protocol is to execute rigorous, cross-boundary end-to-end verification in an environment that maintains strict configuration, data model, and behavioral parity with production.

> **PRIMARY INVARIANT**:
> **NO PRODUCTION TESTING AS A SUBSTITUTE FOR STAGING. ZERO UNVERIFIED MIGRATIONS OR ENDPOINTS DEPLOYED TO PRODUCTION.**

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Staging must be fully isolated from production customer data and live Stripe processing.
   - POS cash, external card, and Stripe online flows must be proven functional on staging before release authorization.
   - Database schema and row-level security (RLS) on staging must match production bit-for-bit.

2. **FROZEN CONTRACT**:
   - `DR-INV-001`: Staging inventory allocations must execute against `sellable_units` with atomic locking.
   - `DR-PAY-001`: Staging payments must write to `order_payments` with channel tags (`stripe`, `cash`, `card_reference`).
   - `DR-AUTH-001`: Unauthenticated or non-admin attempts to access POS endpoints on staging must receive 401/403.
   - `DR-REC-001`: Receipt generation must render exact line items, tax, and tender details.

3. **DERIVED ENGINEERING DESIGN**:
   - Synthetic test store and automated seeding scripts deployed to staging database.
   - Automated staging smoke script running against `STAGING_BASE_URL` with health/readiness validation.
   - Test transaction sanitization and 24-hour retention policy for staging data.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Staging test user accounts (`staging-pos-cashier@selfcaresinners.com`).
   - Automated execution hooks triggered via GitHub Actions workflow dispatch.

---

## 3. Staging Environment Parity Matrix

To ensure that tests executed on staging accurately predict production behavior, the staging environment must maintain exact parity across all architectural tiers:

| Dimension | Production Baseline | Staging Environment | Parity Verification Method |
| :--- | :--- | :--- | :--- |
| **Compute / Runtime** | Railway container, Node.js 22.x, 512MB-1GB RAM | Railway isolated service, Node.js 22.x, identical resources | `GET /api/health` checking Node version and memory metrics |
| **Database Engine** | Supabase Managed PostgreSQL (v15+) | Supabase isolated project / staging schema (v15+) | Automated schema diff check (`pg_dump --schema-only`) |
| **RLS Policies** | Row-level security enabled on all public tables | RLS enabled on all public tables; identical policies | `scripts/qa/database/validate-database-security.ps1` |
| **Stripe Gateway** | Stripe Live Mode | Stripe Test Mode (`sk_test_...` with webhook signing) | Test transaction issuance using official Stripe 4242 test cards |
| **Email Gateway** | Resend Live Domain (`selfcaresinners.com`) | Resend Sandbox / Sinkhole Domain (`sinkhole@...`) | Verification of queue write without external spam delivery |
| **CORS & Headers** | Strict Helmet CSP, origin restricted | Strict Helmet CSP, origin configured for staging domain | HTTP Response header inspection (`curl -I`) |

---

## 4. Staging Regression Execution Suite

> **PLAYWRIGHT STAGING PREREQUISITE & EVIDENCE STANDARD**:
> Root `playwright.config.ts` currently hardcodes `baseURL: 'http://localhost:3000'` and does not evaluate `process.env.BASE_URL` (and launches a local `webServer`).
> Therefore, remote staging Playwright browser execution via `BASE_URL` is currently **UNSUPPORTED** and represents a **BLOCKING PREREQUISITE**. Staging verification must not claim unsupported `BASE_URL` Playwright coverage.
> Whenever Playwright is executed against staging, the evidence artifact **MUST** capture:
> 1. The **effective tested URL** (verifiable proof in logs that requests reached the remote staging host, not `localhost:3000`).
> 2. The **deployed SHA** of the staging target (retrieved from `GET /api/health`).

Before declaring staging verification complete for any release candidate (specifically on **04 Oct 2026** during Hardening), the following test suites must be executed in sequence:

```
[Deploy RC to Staging]
         │
         ▼
[Step 1: Automated Health & Readiness Check]
         │  GET /api/health  -> 200 OK (uptime, version, git SHA)
         │  GET /api/readiness -> 200 OK (env, supabase, stripe, email)
         ▼
[Step 2: Database Integrity & Security Scan]
         │  Validate table schemas, indices, RLS policies, critical functions
         ▼
[Step 3: POS Sales & Inventory E2E Suite]
         │  Cash Tender Sale -> Stock Decrement -> Receipt
         │  Card Reference Sale -> Stock Decrement -> Receipt
         │  Oversell Prevention (Concurrency Stress)
         ▼
[Step 4: POS Refund, Restock & Receipt Suite]
         │  Refund Execution -> Stock Restock -> Credit Note
         ▼
[Step 5: Storefront Ecommerce Regression]
         │  Online Cart -> Stripe Checkout -> Webhook -> Order Fulfillment
         ▼
[Sign-off & Staging Evidence Report]
```

---

## 5. Detailed Test Execution Procedures

### 5.1 Procedure STP-01: Service Readiness & Healthcheck
1. **Target**: `https://staging.selfcaresinners.com/api/readiness`
2. **Execution**:
   ```bash
   curl -s -X GET "https://staging.selfcaresinners.com/api/readiness" \
     -H "Accept: application/json" | jq .
   ```
3. **Pass Criteria**:
   - HTTP status `200 OK`.
   - `status: "ready"`.
   - `checks.env.ok: true`.
   - `checks.supabase.ok: true` (latency < 200ms).
   - `checks.stripe.ok: true`.
   - `checks.email.ok: true`.

### 5.2 Procedure STP-02: POS Cash Tender Sale & Inventory Validation
1. **Objective**: Validate end-to-end POS cash sale, exact change calculation, inventory decrement on `SellableUnit`, and receipt read model creation.
2. **Preconditions**:
   - Cashier authenticated with `admin` role JWT token.
   - Test SKU `SKU-POS-STANDARD-01` has initial stock of 100 units.
3. **Execution**:
   ```bash
   # Execute POS cash sale
   curl -s -X POST "https://staging.selfcaresinners.com/api/pos/sales" \
     -H "Authorization: Bearer $STAGING_ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "clientRequestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
       "storeId": "test-store-selfcare",
       "items": [
         {
           "sellableUnitId": "su_standard_01_uuid",
           "quantity": 2
         }
       ],
       "payment": {
         "channel": "cash",
         "amountTenderedCents": 5000
       }
     }' | jq .
   ```
4. **Pass Criteria**:
   - HTTP status `201 Created` (or `200 OK`).
   - Order created with status `paid`.
   - `order_payments` contains 1 record: `channel: "cash"`, `status: "captured"`, `amount_cents: 4000`, `amount_tendered_cents: 5000`, `change_due_cents: 1000`.
   - Database inventory for `su_standard_01_uuid` atomically decrements from 100 to 98.
   - `receipt` object returned with valid `receiptNumber`, timestamp, line items, and tender breakdown.

### 5.3 Procedure STP-03: POS Oversell Concurrency Prevention
1. **Objective**: Validate that two concurrent POS requests competing for the last unit of stock cannot both succeed.
2. **Preconditions**:
   - Test SKU `SKU-POS-LIMITED-01` set to `stock: 1`.
3. **Execution**:
   - Dispatch two simultaneous POS sale requests via automated harness (`Promise.all`).
4. **Pass Criteria**:
   - Request 1: HTTP `200 OK` (Sale confirmed, stock becomes 0).
   - Request 2: HTTP `409 Conflict` (Error code `INSUFFICIENT_STOCK`).
   - Final stock in `sellable_units` is exactly 0 (never negative).

### 5.4 Procedure STP-04: POS Refund & Restock Verification
1. **Objective**: Validate full refund of a completed cash sale and idempotent restocking of inventory.
2. **Execution**:
   ```bash
   curl -s -X POST "https://staging.selfcaresinners.com/api/pos/refunds" \
     -H "Authorization: Bearer $STAGING_ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "orderId": "ord_stg_test_order_uuid",
       "reason": "Customer returned unopened product",
       "restockItems": true,
       "items": [
         {
           "sellableUnitId": "su_standard_01_uuid",
           "quantity": 2
         }
       ]
     }' | jq .
   ```
3. **Pass Criteria**:
   - HTTP `200 OK`.
   - Order payment status updated to `refunded`.
   - `sellable_units` stock for `su_standard_01_uuid` increments by 2 (reconciled back to 100).
   - Inventory movement ledger records `RESTOCK_RETURN` with actor ID and order reference.
   - Stripe API is NOT called (since original tender was cash).

---

## 6. Staging Sign-Off Criteria

Staging validation is formally signed off as **PASS** when:
1. 100% of automated staging regression scripts pass without error against the staging endpoint.
2. Zero Sev-1 or Sev-2 defects remain open.
3. Database migration scripts execute idempotently on staging via the approved Client 01 migration executor with zero data loss (`apply-remediation-ddl.mjs` is strictly prohibited).
4. Staging validation evidence records the effective tested URL (`https://staging.selfcaresinners.com`) and deployed Git commit SHA.
5. The Staging Verification Evidence artifact is persisted under `artifacts/staging/` and reviewed by QA Lead.
