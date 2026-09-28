# Execution Pack: CCP-13 — Canonical Orders & Payment Ledger Schema

## 1. Responsibility
- **Lead Domain**: Database & Backend Architecture
- **Assignee Lead**: Julian (Backend / Data Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Author database migrations establishing the canonical `order_payments` ledger table, enhancing the `orders` table with omnichannel identifiers (`client_request_id`, `channel`, `cashier_user_id`, `pos_terminal_id`), and updating `order_items` to link to `sellable_units`.

## 3. Why
Fulfills **DR-PAY-001** and establishes canonical omnichannel orders. Decoupling payment records from the monolithic order row is necessary to support in-person cash sales, external card references, independent payment statuses, and future split-tender operations without corrupting Stripe-specific metadata.

## 4. Owner Profile
Senior PostgreSQL / Backend Database Engineer with experience in financial ledger schemas, double-entry bookkeeping principles, and idempotent transactions.

## 5. Preconditions
- CCP-12 (Inventory & SKU Schema Migrations) completed.
- `docs/engineering/client-01/04_ORDER_CONTRACT.md` and `05_PAYMENT_CONTRACT.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-12.
- **Downstream Blocking**: Blocks CCP-14 (POS Sales Backend API), CCP-20 (Receipt Read Model), and CCP-26 (Admin Orders & Payments UI).

## 7. Authoritative Contracts
- **DR-PAY-001 (Payment Ledger)**
- **DR-IDEM-001 (Idempotency Engine)**
- `docs/engineering/client-01/04_ORDER_CONTRACT.md`
- `docs/engineering/client-01/05_PAYMENT_CONTRACT.md`

## 8. Scope IN
- Migration file `supabase/migrations/20260928000002_create_order_payments_ledger.sql`.
- Creation of `order_payments` table with RLS policies and constraints.
- Adding `client_request_id` (UUID unique), `channel`, `cashier_user_id`, and `pos_terminal_id` to `orders`.
- Adding `sellable_unit_id`, `sku`, `total_price` to `order_items`.
- Creation of reconciliation function `verify_order_payment_reconciliation`.
- Backfill SQL script migrating historical paid orders into `order_payments` with channel `'stripe'`.

## 9. Scope OUT
- Web POS sales API endpoint (handled in CCP-14).
- Refund API execution (handled in CCP-21).
- Frontend admin UI (handled in CCP-26).

## 10. Required Behavior
1. Enforce strict check constraints on `payment_channel` (`'stripe'`, `'cash'`, `'card_reference'`).
2. Require unique `idempotency_key` on each payment row.
3. Prevent `refunded_amount` from exceeding `amount`.
4. Guarantee that POS orders can record cash or card payments with structured JSON metadata in `tender_details` without generating fake Stripe IDs.

## 11. Inputs
- DDL statements and migration scripts.
- Historical `orders` rows for ledger backfill.

## 12. Outputs
- Schema table: `order_payments`.
- Enhanced schema tables: `orders` and `order_items`.
- Function: `verify_order_payment_reconciliation`.

## 13. Allowed Implementation Freedom
- Index design for audit queries (e.g. index on created_at vs composite index on status + created_at).
- Specific error message formatting in reconciliation PL/pgSQL helper.

## 14. Forbidden Changes
- NEVER synthesize fake Stripe IDs (e.g. `pi_cash_xxx`) for cash or card payments.
- DO NOT drop legacy Stripe columns on `orders` during this phase.
- DO NOT remove existing order statuses.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `supabase/migrations/20260928000002_create_order_payments_ledger.sql`
  - `scripts/database/backfill-order-payments.sql`
  - `tests/database/payment-ledger-migration.test.ts`
- **Strictly Prohibited**:
  - Runtime code under `src/*` or `server.ts`.

## 16. Data Impact
- Creates `order_payments` table.
- Modifies `orders` and `order_items` tables non-destructively.
- Backfills 100% of historical paid orders into `order_payments`.

## 17. API Impact
- Internal database schema readiness for POS endpoints. No external breaking changes to public `/api/*`.

## 18. Security
- Enable RLS on `order_payments`.
- Customers can select payments only for their own orders (`customer_user_id = auth.uid()`).
- Staff (`owner`/`admin`) have full select/insert access.

## 19. Concurrency & Idempotency
- Unique constraint on `orders.client_request_id` prevents duplicate order records.
- Unique constraint on `order_payments.idempotency_key` prevents double-charging.

## 20. Migration Considerations
- Non-destructive Phase 0 and Phase 3 migration. Nullable foreign keys ensure existing checkout sessions function uninterrupted.

## 21. Edge Cases
- Historical orders without customer email or user ID must still backfill cleanly.
- Orders in `partially_refunded` status must calculate accurate `refunded_amount` in ledger.

## 22. Observability
- Database logs record index and table creation metrics.
- Function `verify_order_payment_reconciliation` outputs detailed discrepancy diagnostics.

## 23. Acceptance Criteria
- [ ] Migration applies cleanly with zero errors.
- [ ] `order_payments` table created with strict check constraints and RLS enabled.
- [ ] Reconciliation query confirms 100% of historical paid orders match captured payment rows.
- [ ] Inserting a payment with duplicate idempotency key raises unique constraint violation.

## 24. Test Strategy
- Database integration test asserting payment insertion, RLS enforcement, and constraint checks.

## 25. Staging Validation
- Apply migration to staging. Run verification queries to ensure 0 unreconciled orders.

## 26. Evidence Requirements
- Successful migration execution log.
- Output of `SELECT verify_order_payment_reconciliation(id) FROM orders LIMIT 20;` showing `is_balanced = true`.

## 27. Definition of Done
- Database migration and backfill scripts tested on staging.
- Code review completed by Lead Architect.
- Ready for CCP-14 implementation.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Julian (proceed to CCP-14 for Web POS API implementation).
