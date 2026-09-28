# Execution Pack: CCP-27 — Web POS Digital Receipt View & In-Store Sales History Record

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Web POS Experience
- **Assignee Lead**: Julian (Frontend Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)

## 2. Objective
Implement the post-sale Web POS digital receipt view modal, standard browser thermal print CSS formatting (58mm/80mm layout), optional customer digital receipt email trigger via Resend, and same-day in-store POS sales history drawer, strictly deriving all receipt data from the canonical persisted `orders`, `order_items`, and `order_payments` records per `DR-REC-001`.

## 3. Why
Fulfills **DR-REC-001**, **DR-PAY-001**, and retail store checkout requirements. Customers in physical stores require immediate proof of purchase (printed paper receipt or email voucher). Cashiers require the ability to review same-day transactions to handle customer inquiries or reissue receipts without leaving the register screen. The receipt must be a pure read model derived deterministically from canonical database records, ensuring zero divergence with backend ledgers.

## 4. Owner Profile
Senior React / Frontend Engineer with expertise in print stylesheet design (`@media print`), modal window lifecycle management, thermal paper typography, and asynchronous action handling.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- CCP-13 (Canonical Orders & Payment Ledger Schema) completed.
- CCP-14 (Web POS Sale API) and CCP-43 (Web POS Register UI) operational.
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md` (DR-REC-001) reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-13, CCP-14, CCP-43.
- **Downstream Blocking**: Blocks CCP-35 (Feature Freeze Enforcement) and CCP-37 (Client UAT Walkthrough).

## 7. Authoritative Contracts
- **DR-REC-001 (Deterministic Receipt Read Model & Decoupled Email Queue)**
- **DR-PAY-001 (Payment Ledger & Multi-Channel Tender)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md`

## 8. Scope IN
- Authoring `src/components/pos/ReceiptModal.tsx`:
  - Store header (Store name, tax RFC/ID, store address, phone).
  - Transaction metadata (Canonical Order ID, date/time, cashier name, terminal ID).
  - Line items: SKU/SellableUnit title, quantity, unit price, line subtotal.
  - Financial totals: subtotal, applied discount, tax, grand total.
  - Tender details: tender method (`cash` with amount tendered and change due, or `card_reference` with auth code).
  - Footer with return policy and store barcode.
- Print CSS styling in `src/styles/pos-receipt.css`:
  - Enforcing `@media print` rules hiding navbar, sidebar, buttons, and app chrome.
  - Strict thermal receipt width constraint (80mm standard, 58mm compact fallback).
  - Monospace high-contrast font, explicit page breaks (`page-break-inside: avoid`).
- Optional customer email receipt trigger:
  - Input field for customer email.
  - "Enviar por Email" button calling `POST /api/pos/orders/:id/email-receipt`.
  - Clear success toast; failure to dispatch email does NOT roll back or affect the sale.
- Authoring `src/components/pos/SalesHistoryDrawer.tsx`:
  - Lists same-day transactions filtered by `channel = 'pos'`.
  - Shows order timestamp, items count, total amount, tender type, and status (`paid`, `refunded`).
  - Allows clicking any historical order to view/reprint its canonical receipt.
- Component and unit tests in `tests/frontend/pos-receipt-view.test.tsx`.

## 9. Scope OUT
- Physical USB/Serial ESC/POS printer driver binaries (Client 01 relies on standard browser print dialog).
- Customer storefront order confirmation page (CCP-24).
- POS sale submission and payment execution (CCP-14 / CCP-43).

## 10. Required Behavior
1. Following successful checkout submission in `CCP-43`, the register automatically opens `ReceiptModal.tsx` populating order and payment data from the API response.
2. Cashier can click "Imprimir Ticket" which triggers `window.print()`.
3. In print preview, only the receipt paper area is visible; all buttons, modals background, and register layout elements are hidden via CSS `@media print`.
4. Cashier can enter customer email and click "Enviar", which fires an asynchronous request.
5. If email request fails (e.g. invalid domain), display error toast; the completed sale and print capability remain completely unaffected.
6. Opening the Sales History drawer fetches `GET /api/pos/orders?limit=20&date=today` and renders recent transactions.

## 11. Inputs
- Confirmed order and receipt read model payload matching `DR-REC-001` contract.
- Customer email string (optional).

## 12. Outputs
- Rendered receipt DOM modal.
- Clean thermal print output.
- Dispatched email request to backend queue.

## 13. Allowed Implementation Freedom
- Receipt visual design (e.g. dotted separator lines vs solid borders).
- Barcode rendering library (e.g. `JsBarcode` svg vs text order number).

## 14. Forbidden Changes
- DO NOT create a second or divergent receipt data ledger in the database; receipt is strictly a read model.
- DO NOT permit email delivery errors to invalidate or roll back a completed sale transaction.
- DO NOT display raw database internal IDs where human-readable order numbers are expected.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/components/pos/ReceiptModal.tsx`
  - `src/components/pos/SalesHistoryDrawer.tsx`
  - `src/styles/pos-receipt.css`
  - `tests/frontend/pos-receipt-view.test.tsx`
- **Strictly Prohibited**:
  - Database schema migrations or backend order persistence logic (Rogelio domain).

## 16. Data Impact
- Read-only consumption of canonical orders and payments. Zero database schema changes.

## 17. API Impact
- Consumes `POST /api/pos/orders/:id/email-receipt` and `GET /api/pos/orders`.

## 18. Security
- Receipt view and sales history accessible strictly to authorized staff (`admin` or `owner`).
- Does not expose full credit card PAN or customer sensitive details on printed receipt.

## 19. Concurrency & Idempotency
- Safe read-only component rendering; duplicate print invocations are local client browser operations.

## 20. Migration Considerations
- Can render receipts for both newly created Web POS orders and historical orders.

## 21. Edge Cases
- Split-line items with discount: properly computes and prints original price and discounted subtotal.
- Cashier prints receipt 3 hours after sale from history: receipt generates identical text and values as the original sale.

## 22. Observability
- Emits client event `receipt_printed` and `receipt_email_sent` with order ID.

## 23. Acceptance Criteria
- [ ] Receipt displays store name, order ID, cashier, SellableUnit items, unit prices, totals, and tender summary.
- [ ] Receipt data is derived 100% from canonical order/payment records per `DR-REC-001`.
- [ ] Browser print (`window.print()`) cleanly isolates the thermal receipt and hides all app navigation.
- [ ] Optional email dispatch calls existing Resend backend infrastructure; delivery error does NOT undo the sale.
- [ ] Sales history drawer filters orders by channel `pos` and displays today's transactions.
- [ ] Component tests in `tests/frontend/pos-receipt-view.test.tsx` pass 100%.

## 24. Test Strategy
- Vitest + React Testing Library tests verifying receipt data binding, print CSS media query presence, email input submission, and history order selection.

## 25. Staging Validation
- Complete a cash sale on Web POS staging, verify that receipt modal pops up with correct change calculation, trigger print preview to inspect layout, and enter email to receive test receipt.

## 26. Evidence Requirements
- Component test execution transcript with 100% assertions green.
- Screenshot of receipt modal and print preview rendering.

## 27. Definition of Done
- Receipt modal and history drawer verified and tested.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for inclusion in Feature Freeze candidate (CCP-35).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: QA Lead (CCP-33 Critical Path E2E & CCP-37 Client UAT).
