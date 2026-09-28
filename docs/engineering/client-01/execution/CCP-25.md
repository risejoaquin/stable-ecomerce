# Execution Pack: CCP-25 — Admin Order Management — Fulfillment Status Updates, Tracking & Exception Recovery

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Admin Command Center
- **Assignee Lead**: Julian (Frontend / Admin Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)

## 2. Objective
Adapt the existing Admin Order Management view (`AdminOrdersPage.tsx`) so that order fulfillment updates (marking orders as 'shipped' with carrier name and tracking URL) persist cleanly and emit lifecycle events for shipping email dispatch, and integrate a 1-click full Stripe refund action with idempotency guards for orders stranded in `inventory_exception` status.

## 3. Why
Fulfills **DR-PAY-001** and backoffice operational requirements. Store managers currently manage orders in `AdminOrdersPage.tsx`, but lack automated shipping notification triggers and an immediate recovery mechanism when an online order encounters an oversell race condition (`inventory_exception`). Providing a 1-click refund action empowers administrators to immediately remediate affected customers without manual Stripe dashboard intervention.

## 4. Owner Profile
Senior React / Frontend Engineer with expertise in administrative table workflows, asynchronous action confirmation modals, Stripe refund API integration, and optimistic state updates.

## 5. Preconditions
- `AdminOrdersPage.tsx` operational in `src/pages/admin/`.
- CCP-13 (Canonical Orders & Payment Ledger) completed.
- CCP-23 (Transactional Email Automation / Shipping Triggers) operational.

## 6. Dependencies
- **Preceding Tickets**: CCP-13, CCP-23.
- **Downstream Blocking**: Blocks CCP-35 (Feature Freeze Enforcement) and CCP-37 (Client UAT).

## 7. Authoritative Contracts
- **DR-PAY-001 (Payment Ledger & Stripe Refund Integration)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/10_REFUND_CONTRACT.md`

## 8. Scope IN
- Enhancing `src/pages/admin/AdminOrdersPage.tsx`:
  - Fulfillment status update modal/inputs: carrier name (`FedEx`, `DHL`, `Estafeta`, `Redpack`, etc.) and tracking URL/number.
  - Submitting status change to `shipped` writes to database and triggers backend lifecycle event for shipping notification dispatch.
  - Visual highlighting and filter badge for orders with `status = 'inventory_exception'` (alert banner or colored row).
  - 1-click action button: `Reembolsar en Stripe` on `inventory_exception` orders.
  - Confirmation dialog with amount, payment intent ID, and reason input.
  - Client idempotency lock disabling the button during flight to prevent duplicate refunds.
  - On refund success, immediately update order status to `refunded` in local table state.
- Component and unit tests in `tests/frontend/admin-order-management.test.tsx`.

## 9. Scope OUT
- Recreating `AdminOrdersPage.tsx` (397 lines) from scratch.
- In-store POS cash/card refund actions (handled in CCP-28).
- Customer storefront order presentation (handled in CCP-24).

## 10. Required Behavior
1. In `AdminOrdersPage.tsx`, selecting an order allows updating fulfillment status to `processing`, `shipped`, `delivered`, or `cancelled`.
2. When transitioning to `shipped`, the UI requires carrier name and tracking code/URL.
3. Submitting the update dispatches `PATCH /api/orders/:id/fulfillment` which updates the database and queues customer shipping email via CCP-23.
4. Orders with status `inventory_exception` render a distinct warning badge and display a red `Reembolsar en Stripe` button.
5. Clicking `Reembolsar en Stripe` opens confirmation modal. Upon confirmation, calls `POST /api/orders/:id/refund` with Stripe payment intent reference and UUID idempotency key.
6. Successful refund transitions order status badge to `refunded` and displays confirmation toast.

## 11. Inputs
- Admin input: carrier name, tracking URL, refund confirmation.
- Order record from `orders` table.

## 12. Outputs
- HTTP PATCH to `/api/orders/:id/fulfillment`.
- HTTP POST to `/api/orders/:id/refund`.
- Updated order status in admin UI.

## 13. Allowed Implementation Freedom
- Dropdown vs radio buttons for carrier selection.
- Visual badge styling (e.g. Tailwind `bg-amber-100 text-amber-800` for `inventory_exception`).

## 14. Forbidden Changes
- DO NOT rewrite or discard existing search, filter, and pagination logic in `AdminOrdersPage.tsx`.
- DO NOT permit calling Stripe refund APIs on cash or card-reference POS orders.
- DO NOT permit duplicate clicks on the refund action button.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/admin/AdminOrdersPage.tsx`
  - `src/components/admin/OrderFulfillmentModal.tsx`
  - `src/components/admin/OrderRefundModal.tsx`
  - `tests/frontend/admin-order-management.test.tsx`
- **Strictly Prohibited**:
  - Backend payment RPCs or database DDL (Rogelio domain).

## 16. Data Impact
- Dispatches status update and refund mutations through authenticated APIs.

## 17. API Impact
- Consumes `PATCH /api/orders/:id/fulfillment` and `POST /api/orders/:id/refund`.

## 18. Security
- Actions restricted strictly to authenticated administrators (`owner` / `admin`).

## 19. Concurrency & Idempotency
- Refund requests attach unique UUID `Idempotency-Key` header; duplicate clicks cannot trigger duplicate Stripe refund calls.

## 20. Migration Considerations
- Operates seamlessly on both legacy orders and new omnichannel order records.

## 21. Edge Cases
- Order already refunded in Stripe directly via dashboard: backend handles webhook reconciliation; UI displays status `refunded` and disables refund action.
- Network interruption during refund call: idempotency key allows safe re-query without double refunding.

## 22. Observability
- Emits admin audit log event: `{ "event": "admin_order_refunded", "orderId": "...", "adminId": "..." }`.

## 23. Acceptance Criteria
- [ ] Admin can enter carrier name and tracking URL when marking order as `shipped`.
- [ ] Status update writes to database and triggers shipping email dispatch event.
- [ ] Orders with status `inventory_exception` are visually highlighted and expose `Reembolsar en Stripe` button.
- [ ] Refund action verifies payment intent ID, executes Stripe refund, and blocks duplicate attempts.
- [ ] Updated status immediately reflects on customer TrackOrderPage.
- [ ] Component tests in `tests/frontend/admin-order-management.test.tsx` pass 100%.

## 24. Test Strategy
- Vitest + React Testing Library tests verifying fulfillment form validation, status change dispatch, refund modal confirmation, and button disabling.

## 25. Staging Validation
- Open Admin Portal on Railway staging, locate test order in `inventory_exception`, execute 1-click refund, verify status transitions to `refunded` and Stripe test dashboard reflects refund.

## 26. Evidence Requirements
- Component test execution transcript showing 100% assertions green.
- Screenshot of `AdminOrdersPage.tsx` displaying `inventory_exception` badge and refund action.

## 27. Definition of Done
- Order fulfillment updates and 1-click refund action verified.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for inclusion in Feature Freeze candidate (CCP-35).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: QA Lead (CCP-35 Feature Freeze & CCP-37 Client UAT).
