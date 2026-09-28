# Execution Pack: CCP-21 — POS Refund & Restock API

## 1. Responsibility
- **Lead Domain**: Backend API Engineering
- **Assignee Lead**: Julian (Backend Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Implement the backend endpoint `POST /api/pos/orders/:id/refund` and associated business services to execute channel-specific refunds, restock physical units to `sellable_units`, update order statuses, and record immutable audit trail entries.

## 3. Why
Physical store operations require returns and refund processing. To prevent revenue leakage and inventory skew, returns must automatically restore inventory to the exact `SellableUnit` and process refunds according to the original payment channel (Stripe API vs cash/card reference).

## 4. Owner Profile
Senior Node.js / Express Backend Engineer with deep knowledge of Stripe refund APIs, PostgreSQL transactions, and stock movement auditing.

## 5. Preconditions
- CCP-12 (Inventory & SKU Schema Migrations) completed.
- CCP-13 (Canonical Orders & Payment Ledger) completed.
- `docs/engineering/client-01/10_REFUND_CONTRACT.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-12, CCP-13, CCP-28, CCP-29.
- **Downstream Blocking**: Blocks CCP-34 (POS Refund & Restock E2E Suite).

## 7. Authoritative Contracts
- **DR-REF-001 (Refund & Restock Rules)**
- **DR-INV-001 (Inventory Authority)**
- **DR-PAY-001 (Payment Ledger)**
- **DR-IDEM-001 (Idempotency Engine)**
- **DR-AUTH-001 (Authorization Model)**
- `docs/engineering/client-01/10_REFUND_CONTRACT.md`

## 8. Scope IN
- Endpoint `POST /api/pos/orders/:id/refund`.
- Input validation schema using Zod.
- Transactional invocation of PostgreSQL `execute_order_refund` stored procedure.
- Conditional Stripe Refund API invocation for orders originally paid via Stripe.
- Restocking physical items via `restock_sellable_unit`.
- Inserting refund audit events into `audit_logs`.

## 9. Scope OUT
- Web POS frontend refund UI (handled in a future UI ticket or admin console).
- Automatic bank chargeback dispute workflows.
- Customer return shipping label generation.

## 10. Required Behavior
1. Require `owner` or `admin` role via `requirePosOperator`.
2. Enforce durable idempotency via `clientRequestId`.
3. Check original payment channel in `order_payments`:
   - If `stripe`: Call `stripe.refunds.create({ payment_intent: refCode, amount: cents })`.
   - If `cash` or `card_reference`: **DO NOT CALL STRIPE**. Record internal refund ledger entry.
4. Call `execute_order_refund` stored procedure to atomically restock items and update order status to `'refunded'` or `'partially_refunded'`.
5. Return HTTP 200 with refund summary DTO.

## 11. Inputs
- HTTP POST params: `id` (Order UUID).
- HTTP Body: `clientRequestId`, `amount`, `items` (array of `{ orderItemId, quantity, restock }`), `reason`, `cardTerminalApproval`.

## 12. Outputs
- HTTP 200 OK: JSON object `{ orderId, status, refundedAmount, restockedUnits, payment }`.
- Database mutations: `orders.status`, `order_payments.status`, `sellable_units.stock`, `inventory_movements`, `audit_logs`.

## 13. Allowed Implementation Freedom
- Internal service helper factoring in `src/services/refund-service.ts`.
- Mocking strategy for Stripe Refund API in unit tests.

## 14. Forbidden Changes
- NEVER call Stripe API for cash or card reference refunds.
- DO NOT allow refund amounts greater than the remaining captured payment amount.
- DO NOT restock items to parent `products` without updating `sellable_units`.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/controllers/pos-refund-controller.ts`
  - `src/services/refund-service.ts`
  - `src/schemas/refund-schemas.ts`
  - `src/routes/pos-routes.ts`
  - `tests/api/pos-refund.test.ts`
- **Strictly Prohibited**:
  - Public customer storefront checkout routes.

## 16. Data Impact
- Increments `sellable_units.stock`.
- Updates `orders` and `order_payments` status and timestamps.
- Inserts new movement rows in `inventory_movements`.

## 17. API Impact
- Exposes `POST /api/pos/orders/:id/refund`.

## 18. Security
- Role authorization (`requirePosOperator`).
- Protects against negative refund amounts or double-refund exploits.

## 19. Concurrency & Idempotency
- Replaying identical `clientRequestId` returns the recorded refund without double-refunding or double-restocking.
- Uses `FOR UPDATE` row locks inside PostgreSQL procedure.

## 20. Migration Considerations
- Operates on orders created under either legacy or new omnichannel schemas.

## 21. Edge Cases
- Partial return where customer only returns 1 of 3 items: order becomes `partially_refunded`.
- Item marked damaged and not restocked (`restock: false`): financial refund executes without incrementing `sellable_units.stock`.

## 22. Observability
- Emits structured log event `order.refund.processed` with metadata (`orderId`, `amount`, `channel`, `actorUserId`).

## 23. Acceptance Criteria
- [ ] Returns 403 `FORBIDDEN` for unprivileged users.
- [ ] Successfully refunds cash sale without triggering Stripe API.
- [ ] Successfully refunds Stripe sale and captures Stripe refund ID.
- [ ] Restocks units in `sellable_units` table when `restock: true`.
- [ ] Fails cleanly with `422 REFUND_NOT_ALLOWED` if requested amount exceeds captured total.

## 24. Test Strategy
- Supertest contract tests verifying cash refund, Stripe mock refund, partial refund, and error handling.

## 25. Staging Validation
- Perform test sale on staging, execute refund endpoint, assert stock increment in database.

## 26. Evidence Requirements
- Passing Supertest log output (`npm test tests/api/pos-refund.test.ts`).
- Database row snapshots before and after refund.

## 27. Definition of Done
- All test suites passing.
- Code reviewed and approved by Architecture Lead.
- Ready for integration with E2E suite CCP-34.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: QA Lead (proceed to CCP-34 for E2E validation).
