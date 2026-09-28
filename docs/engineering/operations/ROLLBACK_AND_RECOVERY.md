# Rollback, Disaster Recovery & Transaction Reconciliation Runbook

**Document ID**: `ROLL-REC-001`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Authority**: Mandatory Operational Rollback & Recovery Procedure  
**Target Release**: Client 01 v1.0  
**Parent Epic**: `CCP-31` / `CCP-44`  

---

## 1. Purpose & Non-Negotiable Invariants

This runbook defines the technical procedures for rolling back application services on Railway, reverting database schema changes on Supabase, and executing Point-in-Time Recovery (PITR) with financial transaction reconciliation.

> **CORE ROLLBACK INVARIANTS**:  
> 1. **DATABASE BACKWARD COMPATIBILITY**: All database migrations for Client 01 must be non-destructive and additive (expand-contract pattern) so that rolling back the application code never breaks existing database queries.  
> 2. **FINANCIAL LEDGER PRESERVATION**: Rolling back application code or database state must never delete recorded payments. Stripe and cash ledger transactions must be reconciled to the penny.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Application rollback capability on Railway must complete in < 3 minutes.
   - Point-in-Time Recovery (PITR) must be enabled on production Supabase instance with minimum 7-day retention.
   - Any transaction discrepancy post-rollback must be resolved through explicit ledger compensating entries.

2. **FROZEN CONTRACT**:
   - `DR-PAY-001`: Payment records are immutable; refunds and adjustments require new ledger entries, never in-place row deletion.
   - `DR-INV-001`: Reconciled stock adjustments must write audit records to the inventory movement log.

3. **DERIVED ENGINEERING DESIGN**:
   - Automated rollback trigger criteria (health probe failure, 5xx error spikes).
   - Step-by-step CLI commands for Railway deployment rollbacks.
   - Post-rollback transaction reconciliation script using Stripe API vs Supabase `order_payments`.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Specific SQL reconciliation query structure (`scripts/qa/database/reconcile-rollback.sql`).

---

## 3. Rollback Trigger Criteria

Rollback is triggered under either automated or manual criteria:

### 3.1 Automated Rollback Triggers
- **Deploy Crash Loop**: Railway service container exits or restarts 3 times within 2 minutes of deployment.
- **Readiness Failure**: `GET /api/readiness` returns HTTP `503 Service Unavailable` for > 180 seconds continuously post-deployment.
- **Critical Error Spike**: Production 5xx HTTP response rate exceeds 5.0% over any 5-minute rolling window immediately following a release.

### 3.2 Manual Rollback Triggers
- **Sev-1 Incident Declared**: Incident Commander issues a formal rollback order.
- **Inventory Inconsistency**: Concurrency bug detected causing negative stock in `sellable_units`.
- **Payment Processing Blocker**: POS sales or Stripe webhooks failing to record payments into `order_payments`.

---

## 4. Step-by-Step Railway Application Rollback

When application rollback is required, execute the following procedure:

```
[Trigger Rollback Decision]
            │
            ▼
[Identify Previous Stable Deployment ID / Git SHA]
            │
            ▼
[Execute Railway Rollback via CLI or Dashboard]
            │
            ▼
[Verify Container Boot & Healthcheck via /api/health]
            │
            ▼
[Execute Post-Rollback Smoke Suite]
            │
            ▼
[Initiate Transaction Reconciliation]
```

### Execution Steps:

1. **Identify Previous Stable Deployment**:
   ```bash
   railway deployment list --service stable-ecomerce
   ```
   Identify the deployment ID that immediately preceded the failing deployment.

2. **Trigger Rollback**:
   ```bash
   railway rollback --service stable-ecomerce
   ```
   *Alternative via Dashboard*: Navigate to Railway project `heroic-solace` -> service `stable-ecomerce` -> Deployments -> Click previous successful deployment -> Select **Redeploy / Rollback**.

3. **Verify Active Container Version**:
   Poll `/api/health` until the returned commit SHA matches the previous stable release:
   ```bash
   curl -s "https://selfcaresinners.com/api/health" | jq '{status, version, uptimeSeconds}'
   ```
   **Expected**: `status: "ok"`, `version: "<PREVIOUS_STABLE_SHA>"`.

---

## 5. Database Schema Rollback & Migration Safety

Because Client 01 utilizes the **Expand/Contract** migration strategy:
- Schema updates deploy in the "Expand" phase: New tables (`sellable_units`, `order_payments`), new nullable columns, and additive views are created first.
- The previous version of the application code remains fully operational against the expanded schema.
- **Rule**: Rolling back application code does NOT require rolling back database schema unless a catastrophic DDL corruption occurred.

### If Emergency DDL Reversion is Required:
1. Never execute destructive drops (`DROP TABLE`, `DROP COLUMN`) during active user traffic.
2. Apply an explicit remediation migration (`revert_migration_xxx.sql`) that removes constraints or restores dropped triggers without deleting collected transaction data.
3. Validate database security policies remain intact:
   ```powershell
   .\scripts\qa\database\validate-database-security.ps1
   ```

---

## 6. Point-in-Time Recovery (PITR) Protocol

If catastrophic database corruption occurs (e.g., unintended bulk deletion or data poisoning), Supabase Point-in-Time Recovery (PITR) must be executed:

1. **Determine Recovery Timestamp**:
   Identify the exact UTC second ($T_{restore}$) immediately preceding the corrupting event from the audit log:
   ```sql
   SELECT MAX(created_at) FROM audit_logs WHERE created_at < '2026-10-05T14:32:00Z';
   ```

2. **Initiate PITR in Supabase**:
   - Access Supabase Dashboard -> Project `dporfgsbwsyqzmlnqrug` -> Database -> Backups -> Point in Time.
   - Specify target timestamp ($T_{restore}$).
   - Initiate restore to a dedicated recovery database instance (never directly overwrite live production without verification).

3. **Verify Data Integrity on Restored Instance**:
   - Verify table counts, row-level security enabled status, and schema integrity.
   - Run verification query:
     ```sql
     SELECT COUNT(*) FROM sellable_units;
     SELECT COUNT(*) FROM order_payments;
     ```

4. **Cutover Traffic**:
   - Update Railway environment variable `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the restored instance.
   - Restart Railway service container.

---

## 7. Post-Rollback Transaction Reconciliation

Any time application or database state is reverted, there is a risk of in-flight transactions (Stripe payments captured while database was recovering).

### Reconciliation Procedure:
1. **Fetch Stripe Charges during Incident Window**:
   Query Stripe CLI or API for all charges created between incident onset and rollback completion:
   ```bash
   stripe charges list --created[gte]=$INCIDENT_START_EPOCH --created[lte]=$ROLLBACK_END_EPOCH --limit 100 > stripe-incident-charges.json
   ```

2. **Query Database Order Payments**:
   ```sql
   SELECT payment_reference, amount_cents, status, created_at 
   FROM order_payments 
   WHERE channel = 'stripe' AND created_at >= '$INCIDENT_START_ISO';
   ```

3. **Reconcile Discrepancies**:
   - If a charge exists in Stripe but is missing from `order_payments`:
     - Create an order backfill record with status `paid_unreconciled`.
     - Dispatch notification to customer service and customer email queue.
   - If cash was tendered in POS during network partition:
     - Cashier uses POS Offline Ledger to submit transactions immediately upon reconnection.

4. **Sign-off**:
   Incident Commander and Financial Lead verify that Stripe total matches `order_payments` total exactly before closing the incident.
