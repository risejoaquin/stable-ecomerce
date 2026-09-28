# Execution Pack: CCP-31 — Database Backup, Point-in-Time Recovery & Migration Verification

**Ticket ID**: `CCP-31`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Role / Owner Profile**: Database Reliability Engineer (DBRE) / Senior Backend Engineer  
**Target Delivery**: Pre-Hardening / Release Readiness  
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)  

---

## 1. Objective, Context & Why

### Objective
Establish and verify automated database backup schedules, Point-in-Time Recovery (PITR) operational readiness, migration idempotency, and row-level security (RLS) policies across all Supabase database instances.

### Why This Matters
Client 01 introduces critical new database tables (`sellable_units`, `order_payments`, `inventory_movements`) and updates stored functions (`decrement_stock`, `finalize_paid_order`). If a database migration introduces syntax errors, locks tables destructively, or corrupts schema definitions, the platform faces catastrophic downtime. Verifying backup recovery and non-destructive migration execution beforehand prevents data loss.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Supabase Point-in-Time Recovery (PITR) must be active with a minimum 7-day retention window.
   - All migrations must be additive and non-destructive (Expand/Contract pattern). Destructive DDL (`DROP TABLE`, `DROP COLUMN`) is strictly forbidden.
   - Row-Level Security (RLS) must remain enabled on 100% of public database tables.

2. **FROZEN CONTRACT**:
   - `DR-INV-001`: `sellable_units` schema must enforce unique SKU per store and non-negative stock constraints.
   - `DR-PAY-001`: `order_payments` ledger schema must enforce immutable channel types (`stripe`, `cash`, `card_reference`).

3. **DERIVED ENGINEERING DESIGN**:
   - Migration idempotency verification harness (`apply-remediation-ddl.mjs`).
   - Automated database security and function scanner (`validate-database-security.ps1`).
   - Backup restoration drill procedure to an isolated branch/staging instance.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Migration file naming convention: `V<timestamp>__<description>.sql`.

---

## 3. Scope Boundaries

- **IN SCOPE**:
  - Verification of Supabase managed backup and PITR status.
  - Automated migration testing against isolated local and staging databases.
  - Verification of stored procedures (`decrement_stock`, `consume_coupon_after_payment`, `finalize_paid_order`) ensuring explicit `search_path` and restricted `anon` execute grants.
  - RLS policy validation on new and existing tables.
- **EXPLICITLY OUT OF SCOPE**:
  - Manual out-of-band schema edits in Supabase SQL editor without version-controlled scripts.
  - Destructive schema drops or down-migrations on live production.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: `CCP-12` (Inventory & SKU Schema), `CCP-13` (Canonical Orders & Payment Ledger).
- **Downstream Dependents**: `CCP-35` (Staging Deployment), `CCP-37` (Release Gate Sign-off), `CCP-38` (Production Release).
- **Preconditions**:
  - `SUPABASE_DB_URL` configured with administrative permissions in staging/testing environment.
  - Node.js PostgreSQL driver (`pg`) installed.

---

## 5. Step-by-Step Implementation & Verification Guide

```
[Migration DDL Authored in scripts/qa/database/]
                     │
                     ▼
[Step 1: Idempotency Dry-Run on Local DB]
         Run migration twice -> Verify zero syntax or constraint errors
                     │
                     ▼
[Step 2: Database Security & RLS Audit]
         Run scripts/qa/database/validate-database-security.ps1
                     │
                     ▼
[Step 3: Stored Procedure Permission Audit]
         Verify prosecdef, explicit search_path, and EXECUTE restrictions
                     │
                     ▼
[Step 4: Supabase Backup & PITR Verification]
         Confirm 7-day retention active in Supabase project dporfgsbwsyqzmlnqrug
                     │
                     ▼
[Step 5: Pre-Flight Production Readiness Confirmation]
```

### Execution Commands:

1. **Execute Migration Verification Script**:
   ```bash
   node scripts/qa/database/preflight-security-remediation.mjs
   ```

2. **Execute Database Security Audit**:
   ```powershell
   .\scripts\qa\database\validate-database-security.ps1
   ```

3. **Verify Stored Function Privileges**:
   ```bash
   node scripts/qa/database/inspect-critical-functions.mjs
   ```

4. **Verify Anon User Cannot Bypass Function Guards**:
   ```bash
   node scripts/qa/database/test-anon-function-access.mjs
   ```

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Check | Command | Pass Criteria | Fail Criteria |
| :--- | :--- | :--- | :--- |
| **RLS Coverage** | `validate-database-security.ps1` | 100% of public tables have `rowsecurity: true` | Any table with `rowsecurity: false` |
| **Migration Idempotency** | Re-run `apply-remediation-ddl.mjs` | Exit code 0; 0 errors on repeated execution | Migration errors on duplicate columns/tables |
| **Function Security** | `inspect-critical-functions.mjs` | Critical functions have explicit `search_path: "public"` | Empty `search_path ""` (SEC-018 finding) |
| **Anon Execution** | `test-anon-function-access.mjs` | Returns HTTP 403 / DB Permission Denied for anon role | Function executes successfully for unauthenticated user |
| **PITR Status** | Supabase Project Settings | PITR enabled; continuous archiving active | PITR disabled or snapshot age > 24h |

---

## 7. Required Verifiable Evidence

1. **Database Security Scan Output**:
   Persisted JSON report at `artifacts/qa/database-security-report.json`.
2. **Schema Inventory Verification**:
   Inspection confirming `sellable_units` and `order_payments` tables created with appropriate indexes and foreign keys.
3. **PITR Verification Artifact**:
   Recorded screenshot or CLI evidence of active Supabase PITR retention policy.

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] All database DDL scripts are idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- [ ] 100% of tables have Row-Level Security enabled.
- [ ] Critical functions (`decrement_stock`, `consume_coupon_after_payment`, `finalize_paid_order`) have explicit `search_path` and restricted `anon` execute permissions.
- [ ] Supabase PITR backup retention verified active.
- [ ] Database rollback and recovery procedure documented and rehearsed.

### Escalation Pathway:
- If a migration script fails on staging, escalate immediately to the Backend Lead.
- If Supabase PITR is reported inactive, block the production release gate (`CCP-37`) until resolved.
