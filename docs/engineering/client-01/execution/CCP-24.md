# Execution Pack: CCP-24 — Web POS Frontend Receipt View & Print Action

## 1. Responsibility
- **Lead Domain**: Frontend Engineering
- **Assignee Lead**: Rogelio (Frontend Lead)
- **Secondary Reviewer**: Julian (Backend Lead)

## 2. Objective
Implement the post-sale Receipt View Modal in the Web POS interface, featuring browser-native 80mm thermal receipt printing (`window.print()`), digital email receipt dispatch trigger, and "New Sale" register reset.

## 3. Why
Following a completed transaction, cashiers must provide customers with either an immediate printed paper receipt or an emailed digital receipt. Implementing clean, browser-native print styles guarantees seamless receipt output on standard thermal receipt printers without needing native desktop driver installations.

## 4. Owner Profile
Frontend React Engineer experienced in print stylesheet optimization (`@media print`), CSS page break controls, modal dialogs, and asynchronous email action handling.

## 5. Preconditions
- CCP-20 (POS Receipt Read Model) completed.
- CCP-23 (POS Cash & Card Tender) completed.
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-20, CCP-23.
- **Downstream Blocking**: Blocks CCP-33 (POS Sales E2E Suite) and CCP-34 (Refund & Restock E2E Suite).

## 7. Authoritative Contracts
- **DR-REC-001 (Receipt & Read Model)**
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md`

## 8. Scope IN
- Receipt modal dialog `src/components/pos/ReceiptModal.tsx`.
- Receipt layout component `src/components/pos/ReceiptPaperLayout.tsx` formatted to 80mm dimensions.
- Thermal print CSS stylesheet (`src/styles/receipt-print.css` or Tailwind `@media print` utility classes) conforming to `11_RECEIPT_CONTRACT.md`.
- "Imprimir Recibo (Print Receipt)" button triggering native `window.print()`.
- "Enviar por Correo (Email Receipt)" form input with async mutation calling `POST /api/pos/orders/:id/email-receipt`.
- "Nueva Venta (New Sale)" button closing the modal and resetting POS register state.

## 9. Scope OUT
- Native ESC/POS USB printer hardware drivers.
- Direct hardware serial port communication.
- Asynchronous email queue worker implementation (handled in CCP-27).

## 10. Required Behavior
1. Open automatically upon successful completion of a sale in `TenderModal` (CCP-23).
2. Display formatted receipt: Store header, receipt number, date/time, cashier name, line items, subtotals, tender details, and barcode/QR string.
3. Print action: invoking `window.print()` prints **only** the receipt contents, hiding all background POS UI elements via `.no-print` classes.
4. Email receipt action: accepts optional email address, validates syntax, submits to backend, displays success toast without closing modal.
5. "Nueva Venta": closes modal, ensures cart is completely empty, focuses catalog search input for next customer.

## 11. Inputs
- `ReceiptReadModel` JSON object passed from successful sale or fetched via `GET /api/pos/orders/:id/receipt`.
- Optional customer email input string.

## 12. Outputs
- Operating system print dialog triggered via `window.print()`.
- HTTP POST request to `/api/pos/orders/:id/email-receipt`.
- Register state reset signal to `usePosCartStore`.

## 13. Allowed Implementation Freedom
- Receipt visual design details within the constraints of monochrome thermal printing (e.g. dashed separator styles, font selection like Courier New or monospace).
- Auto-print option toggle in staff settings (e.g. auto-trigger print upon sale completion).

## 14. Forbidden Changes
- DO NOT rely on external PDF rendering services.
- DO NOT block or delay the "Nueva Venta" flow if an email receipt request is pending.
- DO NOT render color graphics or heavy imagery that degrades thermal print quality.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/components/pos/ReceiptModal.tsx`
  - `src/components/pos/ReceiptPaperLayout.tsx`
  - `src/styles/receipt-print.css`
  - `tests/unit/components/receipt-modal.test.tsx`
- **Strictly Prohibited**:
  - Backend API code or database schema files.

## 16. Data Impact
- Client-side presentation state only.

## 17. API Impact
- Consumes `GET /api/pos/orders/:id/receipt` and `POST /api/pos/orders/:id/email-receipt`.

## 18. Security
- Sanitizes email input before submitting.
- Displays only sanitized customer and payment data.

## 19. Concurrency & Idempotency
- Pure read presentation. Multiple print clicks generate identical output without backend mutations.

## 20. Migration Considerations
- None. Fully compatible with new receipt contract.

## 21. Edge Cases
- Cashier clicks "Nueva Venta" without printing: modal warns or allows quick dismiss.
- Cashier enters invalid email: client-side validation displays inline error without submitting.

## 22. Observability
- Client log recording receipt view and print actions for cashier usage analytics.

## 23. Acceptance Criteria
- [ ] Modal displays complete receipt data conforming to DR-REC-001.
- [ ] Printing isolates receipt to 80mm width and completely hides rest of application UI.
- [ ] Email input submits to backend and displays confirmation toast.
- [ ] "Nueva Venta" resets cart and returns focus to search bar.

## 24. Test Strategy
- Vitest / React Testing Library tests for print trigger mock, email form validation, and reset state.

## 25. Staging Validation
- Complete test sale on staging, verify on-screen receipt matches database record, test print dialog in Chrome/Safari.

## 26. Evidence Requirements
- Passing React Testing Library test log.
- Print-preview screenshot demonstrating clean 80mm monochrome layout.

## 27. Definition of Done
- Component fully integrated with tender modal.
- Tested across desktop Chrome, Edge, and iPad Safari print dialogs.
- Ready for CCP-33 E2E test suite.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: QA Lead (proceed to CCP-33 for E2E validation).
