# Execution Pack: CCP-28 — POS Sale Cancellation & Restock — In-Store Refund Action & Restitution UI

## 1. Responsibility
- **Lead Domain**: Backend API & POS Transaction Orchestration
- **Assignee Lead**: Rogelio (Backend / Database Lead)
- **Secondary Reviewer**: Julian (Frontend Lead)

## 2. Objective
Implement the payment-channel-aware POS sale refund and cancellation endpoint (`POST /api/pos/orders/:id/refund`) and associated restitution UI action, guaranteeing that in-store returns restore the exact `SellableUnit`s originally sold via atomic restock RPC `restock_sellable_unit`, record payment reversals strictly in the internal `order_payments` ledger without invoking the Stripe API for cash or card-reference sales, and enforce strict idempotency to prevent duplicate refund/restock operations.

## 3. Why
Fulfills **DR-PAY-001**, **DR-INV-001**, and **DR-AUTH-001**. A critical architectural boundary in Client 01 is the separation of payment channels: cash and external card terminals are recorded in internal ledgers and MUST NEVER invoke external Stripe refund endpoints. Restocking must target discrete SellableUnits, not generic product-level stock, to preserve inventory integrity. Duplicate requests must be blocked to prevent double-restocking physical inventory or financial distortion.

## 4. Owner Profile
Senior Backend / Database Engineer with expertise in transactional financial reversions, inventory lifecycle management, REST API security, and race condition prevention.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- CCP-39 (SellableUnit Foundation), CCP-12 (Inventory Restock RPC), and CCP-13 (Payment Ledger) completed.
- `docs/engineering/client-01/10_REFUND_CONTRACT.md` (DR-PAY-001) reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-39, CCP-12, CCP-13, CCP-14, CCP-22.
- **Downstream Blocking**: Blocks CCP-34 (Pre-Freeze System Validation) and CCP-37 (Client UAT Walkthrough).

## 7. Authoritative Contracts
- **DR-PAY-001 (Payment Ledger & Channel-Aware Refund Rules)**
- **DR-INV-001 (Inventory Authority & Exact Unit Restock)**
- **DR-AUTH-001 (POS Authorization — Owner/Admin Only)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/10_REFUND_CONTRACT.md`

## 8. Scope IN
- Implementation of Express endpoint: `POST /api/pos/orders/:id/refund`.
- Request payload validation (Zod schema):
  - `reason`: enum (`customer_return`, `cashier_error`, `defective_item`, `cancelled`).
  - `items`: optional array of `{ orderItemId, quantity }` for partial refund, or empty for full refund.
  - `clientRequestId`: UUID v4 idempotency token.
- Validation checks:
  1. Target order exists and has `channel = 'pos'`.
  2. Target order status is `'paid'`; reject orders already `'refunded'` or `'cancelled'`.
  3. Validate caller role is strictly `'admin'` or `'owner'` via `requirePosOperator`.
- Transactional execution:
  1. Record reversal row in `order_payments` with negative amount matching refunded tender.
  2. For cash transactions: record ledger entry `channel = 'cash', status = 'refunded'`. ZERO Stripe API calls.
  3. For card-reference transactions: record ledger entry `channel = 'card_reference', status = 'refunded'`. ZERO Stripe API calls.
  4. Invoke `restock_sellable_unit` RPC for each returned order item, incrementing `sellable_units.stock` and writing audit records to `inventory_movements`.
  5. Update parent `orders.status` to `'refunded'` or `'partially_refunded'`.
- In-store refund action modal in POS history drawer (Julian collaboration).
- Automated test coverage in `tests/api/pos-refund-restock.test.ts`.

## 9. Scope OUT
- Online ecommerce Stripe refunds (handled via CCP-25 Admin Order Management).
- Physical cash drawer kick hardware integrations.
- Store credit voucher management (Client 02 feature).

## 10. Required Behavior
1. Only authenticated staff with role `owner` or `admin` can execute the refund endpoint.
2. The endpoint inspects the original `order_payments` records for the order.
3. If the payment channel was `cash` or `card_reference`, the refund is executed entirely within PostgreSQL without initiating HTTP requests to Stripe.
4. If an engineer attempts to call Stripe SDK on a cash order, the transaction must fail an invariant assertion.
5. All returned items increment the discrete `sellable_units.stock` count for the exact SKU sold.
6. A second request with the same `clientRequestId` returns the existing refund confirmation without restocking items a second time.

## 11. Inputs
- HTTP POST to `/api/pos/orders/:id/refund` with body:
  ```json
  {
    "reason": "customer_return",
    "clientRequestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "notes": "Customer returned unopened item with receipt"
  }
  ```

## 12. Outputs
- HTTP 200 OK:
  ```json
  {
    "success": true,
    "orderId": "...",
    "refundedAmount": 450.00,
    "paymentChannel": "cash",
    "status": "refunded",
    "restockedUnits": [
      { "sellableUnitId": "...", "quantity": 1 }
    ]
  }
  ```
- HTTP 400 / 403 / 404 / 409 error envelope conforming to `DR-ERR-001`.

## 13. Allowed Implementation Freedom
- Internal stored procedure vs multi-statement SQL transaction within Express handler.
- Optional customer signature capture in UI.

## 14. Forbidden Changes
- ABSOLUTE PROHIBITION: DO NOT invoke Stripe API (`stripe.refunds.create`) for cash or card-reference POS refunds.
- DO NOT restock generic `products.stock` without restocking the exact `sellable_units` record.
- DO NOT allow unauthorized users (`user` or `support`) to trigger refunds.
- DO NOT allow double-refunding or restocking an order that is already refunded.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/server/pos/pos-refund-controller.ts`
  - `server.ts` (route registration)
  - `src/components/pos/RefundModal.tsx`
  - `tests/api/pos-refund-restock.test.ts`
- **Strictly Prohibited**:
  - Direct alteration of online checkout endpoints.

## 16. Data Impact
- Inserts negative reversal record in `order_payments`.
- Increments `sellable_units.stock`.
- Inserts audit rows into `inventory_movements`.
- Updates `orders.status = 'refunded'`.

## 17. API Impact
- Exposes `POST /api/pos/orders/:id/refund`.

## 18. Security
- Enforces strict RBAC (`requirePosOperator`).
- Preserves complete non-repudiation audit trail identifying the refunding cashier and reason.

## 19. Concurrency & Idempotency
- Uses PostgreSQL transaction with `SELECT ... FOR UPDATE` on `orders` and `order_payments` to prevent race conditions.
- Uses `clientRequestId` idempotency key.

## 20. Migration Considerations
- Operates after `sellable_units` (CCP-12) and `order_payments` (CCP-13) are active.

## 21. Edge Cases
- Cashier clicks "Reembolsar" twice rapidly: second request returns 200 with cached result or 409 `ORDER_ALREADY_REFUNDED`; stock is restocked only once.
- Partial refund of 1 item from a 3-item order: order transitions to `partially_refunded`; only the returned SellableUnit is restocked.

## 22. Observability
- Emits structured financial audit log: `{ "event": "pos_order_refunded", "orderId": "...", "channel": "cash", "amount": 450, "cashier": "..." }`.

## 23. Acceptance Criteria
- [ ] Authorized staff (`owner` or `admin`) can initiate POS refund.
- [ ] Unauthorized users (`user`, `support`, unauthenticated) receive HTTP 401/403.
- [ ] Backend validates order is in `paid` status before allowing refund.
- [ ] Cash and card-reference refunds NEVER invoke Stripe API.
- [ ] Restock accurately increments the exact `sellable_units` records sold.
- [ ] Duplicate refund requests cannot refund or restock twice.
- [ ] POS history reflects `refunded` state.
- [ ] Automated tests in `tests/api/pos-refund-restock.test.ts` pass with 100% assertions green.

## 24. Test Strategy
- Vitest + Supertest integration tests verifying cash refund, card reference refund, zero Stripe call assertions, duplicate request idempotency, and inventory restock verification.

## 25. Staging Validation
- Perform a cash sale on Web POS staging, execute refund via POS history drawer, verify in Supabase that `sellable_units.stock` is restored by 1 and `order_payments` contains the refund ledger record.

## 26. Evidence Requirements
- Terminal execution output of `npm test tests/api/pos-refund-restock.test.ts`.
- Supabase SQL query showing restocked inventory and payment reversal row.

## 27. Definition of Done
- Refund endpoint and restitution UI action verified.
- Code reviewed and approved by Frontend Lead (Julian) and Technical Authority (Joaquin).
- Ready for integration with Pre-Freeze Validation (CCP-34).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Julian (wire refund action button in Sales History Drawer) and QA Lead (CCP-34 Pre-Freeze Validation).
