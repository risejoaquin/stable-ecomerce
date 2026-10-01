# Execution Pack: CCP-20 — Controlled Inventory Adjustments — Stock Adjustment API & Movement Audit Logging

## 1. Responsibility
- **Lead Domain**: Database & Inventory Backend API
- **Assignee Lead**: Rogelio (Backend / Database Lead)
- **Secondary Reviewer**: Julian (Frontend Lead)

## 2. Objective
Implement the privileged backend inventory adjustment API endpoint (`POST /api/inventory/adjustments`) and associated database transaction, allowing authorized staff to make signed integer stock adjustments against specific `SellableUnit`s, requiring mandatory reason codes, capturing actor metadata, preventing negative balances, and recording immutable audit records in `inventory_movements`.

## 3. Why
Fulfills **DR-INV-001** and establishes backoffice inventory control. Discrepancies arise in physical retail due to damage, shrinkage, count corrections, and manual supplier restocking. Direct manual modification of database rows or unlogged mutations destroys inventory integrity. This endpoint provides an auditable, controlled mechanism to adjust stock with non-repudiation.

## 4. Owner Profile
Senior Backend / Database Engineer with expertise in transactional SQL updates, row-level locking, audit ledger schemas, and Express REST endpoint security.

## 5. Preconditions
- CCP-39 (SellableUnit Foundation) completed.
- CCP-12 (Inventory Schema Migrations & `inventory_movements` table) completed.
- Staff authentication and role checks (`DR-AUTH-001`) operational.

## 6. Dependencies
- **Preceding Tickets**: CCP-39, CCP-12, CCP-22 (POS / Admin Auth).
- **Downstream Blocking**: Blocks CCP-21 (Admin Catalog UI Stock Adjustment Modal) and CCP-35 (Feature Freeze).

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority & Movement Ledger)**
- **DR-AUTH-001 (Role Authorization Model)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md`

## 8. Scope IN
- Implementation of Express route handler: `POST /api/inventory/adjustments`.
- Zod schema validation for request payload:
  - `sellableUnitId`: UUID (mandatory).
  - `delta`: non-zero integer (positive for addition, negative for reduction).
  - `reason`: enum (`restock`, `damage`, `shrinkage`, `audit`).
  - `notes`: optional string (max 500 characters).
- Database RPC or transaction executing `SELECT stock FROM sellable_units WHERE id = $1 FOR UPDATE`.
- Enforcing `stock + delta >= 0`; rejecting adjustments that would result in negative stock with HTTP 400 `INVALID_STOCK_ADJUSTMENT`.
- Inserting immutable movement record into `inventory_movements` capturing `sellable_unit_id`, `product_id`, `delta`, `reason`, `actor_user_id`, and `created_at`.
- Automated test coverage in `tests/api/inventory-adjustments.test.ts`.

## 9. Scope OUT
- Admin frontend modal component (handled under CCP-21).
- Direct mutation of legacy `products.stock` as authority (handled via backfill trigger).
- Customer-facing inventory reservation.

## 10. Required Behavior
1. Endpoint requires authenticated session with role `owner` or `admin`.
2. Validates `delta` is a non-zero integer; rejects zero or floating-point values with HTTP 400.
3. Locks the target `sellable_units` row within a transaction.
4. If `stock + delta < 0`, rolls back transaction and returns HTTP 400 with code `NEGATIVE_STOCK_PROHIBITED`.
5. Updates `sellable_units.stock = stock + delta`.
6. Inserts a row into `inventory_movements` with all metadata.
7. Commits transaction and returns HTTP 200 with updated unit state.

## 11. Inputs
- HTTP POST JSON payload:
  ```json
  {
    "sellableUnitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "delta": -2,
    "reason": "damage",
    "notes": "Dropped during restocking"
  }
  ```
- Authenticated user context (`req.user.id`, `req.user.role`).

## 12. Outputs
- HTTP 200 OK:
  ```json
  {
    "success": true,
    "sellableUnitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "previousStock": 10,
    "newStock": 8,
    "delta": -2,
    "reason": "damage",
    "movementId": "b1a7d6e2-..."
  }
  ```
- HTTP 400 / 403 / 404 / 409 error envelope conforming to `DR-ERR-001`.

## 13. Allowed Implementation Freedom
- Implementing logic as pure PL/pgSQL stored procedure `adjust_sellable_unit_stock` vs TypeScript transaction with query builder.
- Additional audit fields (e.g. store location tag if multi-location support is added).

## 14. Forbidden Changes
- DO NOT permit unauthenticated callers to trigger adjustments.
- DO NOT allow negative resulting stock quantities under any circumstance.
- DO NOT perform inventory adjustments without writing a row to `inventory_movements`.
- DO NOT mutate `products.stock` directly without updating `sellable_units`.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/server/inventory/` (controller and validation schemas)
  - `server.ts` (route registration)
  - `supabase/migrations/` (stored procedure if used)
  - `tests/api/inventory-adjustments.test.ts`
- **Strictly Prohibited**:
  - Client-side React components or store UI.

## 16. Data Impact
- Updates `sellable_units.stock`.
- Inserts audit record into `inventory_movements`.

## 17. API Impact
- Exposes `POST /api/inventory/adjustments`.
- Conforms to standard error envelope `DR-ERR-001`.

## 18. Security
- Route protected by `requirePosOperator` / `requireAdmin` middleware.
- Input validation sanitizes `notes` to prevent SQL/script injection.

## 19. Concurrency & Idempotency
- Uses `FOR UPDATE` row lock on target `sellable_units` record, preventing lost updates under concurrent adjustment requests.

## 20. Migration Considerations
- Operates after `sellable_units` DDL migration (CCP-12) is active.

## 21. Edge Cases
- Delta would cause negative inventory: rejected with HTTP 400.
- Target `sellableUnitId` does not exist: returns HTTP 404 `SELLABLE_UNIT_NOT_FOUND`.
- User attempts delta = 0: rejected with HTTP 400 `INVALID_DELTA`.

## 22. Observability
- Emits structured log on every adjustment: `{ "event": "inventory_adjusted", "unitId": "...", "delta": -2, "actor": "...", "reason": "damage" }`.

## 23. Acceptance Criteria
- [ ] Endpoint rejects unauthenticated or non-admin requests with HTTP 401/403.
- [ ] Valid positive delta increases stock and writes record to `inventory_movements`.
- [ ] Valid negative delta decreases stock and writes record to `inventory_movements`.
- [ ] Request resulting in negative stock is rejected with HTTP 400 and zero database changes.
- [ ] Missing reason or invalid reason string returns HTTP 400.
- [ ] Automated API integration tests under `tests/api/inventory-adjustments.test.ts` pass 100%.

## 24. Test Strategy
- Vitest + Supertest integration tests exercising positive adjustments, negative adjustments, boundary exhaustion, and unauthorized role rejection.

## 25. Staging Validation
- Perform test adjustment via authenticated curl on Railway staging, inspect Supabase `inventory_movements` table to confirm audit row creation.

## 26. Evidence Requirements
- Terminal test execution logs showing all adjustment scenarios passing.
- SQL query output demonstrating audit row in `inventory_movements`.

## 27. Definition of Done
- API endpoint tested and verified.
- Code reviewed and approved by Frontend Lead (Julian) and Technical Authority (Joaquin).
- Ready for integration with Admin Catalog UI (CCP-21).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Julian (wire adjustment modal in Admin Catalog UI CCP-21).
