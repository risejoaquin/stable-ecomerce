# Execution Pack: CCP-26 — Admin Orders & Payments Ledger UI

## 1. Responsibility
- **Lead Domain**: Frontend Engineering
- **Assignee Lead**: Rogelio (Frontend Lead)
- **Secondary Reviewer**: Julian (Backend Lead)

## 2. Objective
Upgrade the existing `/admin/orders` interface in React to display omnichannel sales channels (`web_storefront` vs `pos_register`), operating cashiers, and a dedicated Payment Ledger drawer detailing individual tenders from `order_payments`.

## 3. Why
Fulfills **DR-PAY-001** visibility requirements. Administrators and store managers need complete visibility into in-store cash transactions, card reference codes, and Stripe payments, along with cashier accountability for daily cash drawer reconciliation.

## 4. Owner Profile
Frontend React Engineer skilled in data visualization, administrative tables, filtering controls, and financial detail drawers.

## 5. Preconditions
- CCP-13 (Canonical Orders & Payment Ledger Schema) completed.
- Existing order management pages in `src/pages/admin/AdminOrders.tsx` inspected.

## 6. Dependencies
- **Preceding Tickets**: CCP-13.
- **Downstream Blocking**: Operational sign-off for financial auditing.

## 7. Authoritative Contracts
- **DR-PAY-001 (Payment Ledger)**
- **DR-AUTH-001 (Authorization Model)**
- `docs/engineering/client-01/04_ORDER_CONTRACT.md`
- `docs/engineering/client-01/05_PAYMENT_CONTRACT.md`

## 8. Scope IN
- Enhancements to `src/pages/admin/AdminOrders.tsx` and order detail modals.
- Filter orders by sales channel (`Todos`, `Tienda en Línea`, `Punto de Venta Web POS`).
- Sales channel badge on each order row (`Web` vs `POS`).
- Cashier column displaying the staff member who executed the sale.
- "Libro de Pagos (Payment Ledger)" section in order details displaying:
  - Payment channel (`Stripe`, `Efectivo`, `Tarjeta / Terminal`).
  - Payment status badge (`captured`, `pending`, `refunded`).
  - Tender details: Cash tendered, change given, or card terminal approval code.
  - Idempotency key and timestamp.
- End-of-day register summary report modal showing cash collected vs card reference total.

## 9. Scope OUT
- Direct accounting ERP integrations (QuickBooks/SAP).
- Mexican CFDI invoice generation.
- Stripe balance payout transfers.

## 10. Required Behavior
1. Require `owner` or `admin` role to access order details and payment records.
2. Clearly distinguish Web orders from POS orders in the main table.
3. In order detail view, render all records from `order_payments` associated with the order.
4. If payment was cash, display: "Monto recibido: $X.XX | Cambio: $Y.YY".
5. If payment was card reference, display: "Ref / Auth: XXXX | Terminal: YYYY".

## 11. Inputs
- Filter parameters (channel, date range, status, cashier).
- Order data fetched from `GET /api/admin/orders`.

## 12. Outputs
- Filtered table view and payment ledger detail drawer.

## 13. Allowed Implementation Freedom
- Drawer vs modal presentation for order detail view.
- Color coding of channel badges using existing design system tokens.

## 14. Forbidden Changes
- DO NOT display full credit card numbers or unmasked sensitive data.
- DO NOT allow editing historical payment amounts directly from the UI.
- DO NOT expose customer passwords or internal tokens.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/admin/AdminOrders.tsx`
  - `src/components/admin/orders/*`
  - `src/components/admin/payments/*`
  - `tests/unit/components/admin-orders.test.tsx`
- **Strictly Prohibited**:
  - Public customer order tracking pages (`src/pages/track/*`).

## 16. Data Impact
- Read queries joining `orders`, `order_payments`, and `users`.

## 17. API Impact
- Consumes `GET /api/admin/orders` and `GET /api/admin/orders/:id/payments`.

## 18. Security
- Staff role enforcement (`owner` or `admin`).
- Read-only financial ledger presentation protects audit integrity.

## 19. Concurrency & Idempotency
- Read-only operational views.

## 20. Migration Considerations
- Displays historical orders cleanly with "Stripe (Histórico)" badge for backfilled rows.

## 21. Edge Cases
- Order with multiple payment entries: correctly sums total captured and highlights any discrepancy.
- Walk-in sale without customer email: displays "Venta Mostrador".

## 22. Observability
- Staff navigation and filter events logged in browser telemetry.

## 23. Acceptance Criteria
- [ ] Channel filter cleanly separates Web orders from POS sales.
- [ ] POS orders display operating cashier name.
- [ ] Payment Ledger drawer renders tender details (cash change / terminal ref code).
- [ ] Summary total accurately calculates total in-store cash collected for a selected date.

## 24. Test Strategy
- React Testing Library unit tests verifying channel filtering, cashier badge rendering, and payment ledger breakdown.

## 25. Staging Validation
- Filter staging orders by POS channel, open a completed cash sale, verify cash tendered and change due match test inputs.

## 26. Evidence Requirements
- Passing React Testing Library test log.
- Screenshots of Admin Orders list with channel badges and the Payment Ledger drawer.

## 27. Definition of Done
- Admin UI fully functional, verified on staging dataset.
- Zero TypeScript diagnostics.
- Approved by Frontend Lead.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Operations and Accounting staff.
