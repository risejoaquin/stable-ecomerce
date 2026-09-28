# Execution Pack: CCP-12 — Inventory & SKU Schema Migrations

## 1. Responsibility
- **Lead Domain**: Database & Migration Engineering
- **Assignee Lead**: Rogelio (Backend / Database Lead)
- **Secondary Reviewer**: Julian (Frontend Lead)

## 2. Objective
Author and verify idempotent Supabase PostgreSQL database migrations for `sellable_units`, the atomic stock decrement stored procedure `decrement_sellable_unit_stock`, the restock procedure `restock_sellable_unit`, and synchronization triggers back to `products.stock`.

## 3. Why
Fulfills **DR-INV-001**. The platform requires a transactional database structure capable of executing row-level locks on discrete physical items to prevent overselling between online shoppers and POS cashier sales.

## 4. Owner Profile
Senior PostgreSQL / Backend Database Engineer with deep expertise in PL/pgSQL, transaction isolation levels, row-level locking (`SELECT ... FOR UPDATE`), and zero-downtime schema evolution.

## 5. Preconditions
- CCP-39 (SellableUnit Foundation) completed.
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md` and `13_DATA_MIGRATION_STRATEGY.md` reviewed.

## 6. Dependencies
- **Preceding Tickets**: CCP-39.
- **Downstream Blocking**: Blocks CCP-13 (Orders & Payments Schema) and CCP-14 (POS Sales Backend API).

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority)**
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md`
- `docs/engineering/client-01/13_DATA_MIGRATION_STRATEGY.md`

## 8. Scope IN
- Migration file `supabase/migrations/20260928000001_create_sellable_units.sql`.
- Creation of `sellable_units` table with RLS policies, unique constraints, and indexes.
- Foreign key column `sellable_unit_id` added to `inventory_movements`.
- PL/pgSQL stored procedure `decrement_sellable_unit_stock` with dead-lock prevention sorting and row-level locks.
- PL/pgSQL stored procedure `restock_sellable_unit`.
- Synchronization trigger `trg_sync_parent_product_stock` for backwards compatibility.
- Phased backfill SQL scripts for simple and variant products.

## 9. Scope OUT
- Application backend API endpoints (handled in CCP-14).
- Admin frontend management UI (handled in CCP-25).
- Payment ledger modifications (handled in CCP-13).

## 10. Required Behavior
1. Table creation must be idempotent (`CREATE TABLE IF NOT EXISTS`).
2. Row-level security must be enabled immediately upon table creation.
3. `decrement_sellable_unit_stock` must accept an array of `{ sellable_unit_id, quantity }`, lock rows in ascending UUID order, abort if stock < quantity, decrement stock, and insert audit records into `inventory_movements`.
4. Trigger must automatically update parent `products.stock` to equal the sum of active child units.

## 11. Inputs
- Structured JSON array of items to decrement within a PostgreSQL transaction.
- Historical product records in `products` for backfill execution.

## 12. Outputs
- Schema tables: `sellable_units`.
- Functions: `decrement_sellable_unit_stock`, `restock_sellable_unit`.
- Audit rows created in `inventory_movements`.

## 13. Allowed Implementation Freedom
- Exact indexing strategy tuning (e.g. partial index on active units vs full index).
- Internal variable naming in PL/pgSQL functions.

## 14. Forbidden Changes
- DO NOT execute non-idempotent migration scripts.
- DO NOT drop existing columns `products.stock` or `products.variants`.
- DO NOT weaken table RLS policies.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `supabase/migrations/20260928000001_create_sellable_units.sql`
  - `scripts/database/backfill-sellable-units.sql`
  - `tests/database/inventory-migration.test.ts`
- **Strictly Prohibited**:
  - Runtime application code in `src/*` or `server.ts`.

## 16. Data Impact
- Adds `sellable_units` table.
- Alters `inventory_movements` to add nullable `sellable_unit_id`.
- Backfills approximately $N$ records into `sellable_units`.

## 17. API Impact
- No direct external HTTP API changes. Exposes PostgreSQL RPC callable via Supabase JS client.

## 18. Security
- Functions must specify `SECURITY DEFINER` and explicitly declare `SET search_path = public, pg_temp;` to mitigate privilege escalation.
- Public read access permitted only for active units; write operations restricted to staff.

## 19. Concurrency & Idempotency
- Stored procedure executes `FOR UPDATE` on sorted IDs, guaranteeing deadlock immunity.
- Stock checks and updates execute atomically within a single database transaction.

## 20. Migration Considerations
- Non-destructive Phase 0 and Phase 1 migration. Zero downtime on existing storefront traffic.

## 21. Edge Cases
- Concurrent deduction of the last item in stock: one caller succeeds, second caller receives clean `INSUFFICIENT_STOCK` error.
- Zero or negative quantity inputs must trigger immediate exception.

## 22. Observability
- All successful decrements and restocks write audit records to `inventory_movements` with causal `order_id`.

## 23. Acceptance Criteria
- [ ] Migration script applies cleanly to a fresh database and on top of existing schema.
- [ ] RLS policies verified: unauthenticated users cannot insert or update units.
- [ ] Backfill query correctly populates units for standalone and variant products.
- [ ] Concurrency test proves zero oversells when 10 units are decremented concurrently.

## 24. Test Strategy
- Vitest/Supabase integration test invoking `decrement_sellable_unit_stock` directly under simulated concurrency.

## 25. Staging Validation
- Apply migration to isolated staging database. Verify table structure using `scripts/qa/check-supabase-integrity.sql`.

## 26. Evidence Requirements
- Schema diff output confirming table, function, and trigger creation.
- Test log showing clean execution of backfill verification queries with 0 discrepancies.

## 27. Definition of Done
- Migration SQL reviewed and approved by Architecture Lead.
- All integration tests pass.
- Ready for deployment to staging.

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Rogelio (proceed to CCP-13 for Canonical Orders and Payment Ledger).
