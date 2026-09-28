# Execution Pack: CCP-23 — Web POS Frontend Cash & Card Reference Tender

## 1. Responsibility
- **Lead Domain**: Frontend Engineering
- **Assignee Lead**: Rogelio (Frontend Lead)
- **Secondary Reviewer**: Julian (Backend Lead)

## 2. Objective
Implement the tender settlement dialog modal in the Web POS interface, featuring Cash Tender (with automatic change calculation and quick-cash denomination buttons) and External Card Reference entry (with validation of terminal authorization code).

## 3. Why
Completing an in-person retail sale requires fast, accurate tender processing. Cashiers need instant change calculation to prevent human calculation errors, and clear validation for card terminal reference codes to ensure transactions can be matched during daily end-of-day register balancing.

## 4. Owner Profile
Frontend React Engineer proficient in modal design, form validation, focus trapping, financial formatting, and asynchronous API submission state machines.

## 5. Preconditions
- CCP-14 (POS Sales Backend API) completed.
- CCP-22 (Web POS Terminal UI) completed.
- `docs/engineering/client-01/05_PAYMENT_CONTRACT.md` and `09_POS_API_CONTRACT.md` reviewed.

## 6. Dependencies
- **Preceding Tickets**: CCP-14, CCP-22.
- **Downstream Blocking**: Blocks CCP-24 (Receipt View & Print Action) and CCP-33 (POS Sales E2E Suite).

## 7. Authoritative Contracts
- **DR-PAY-001 (Payment Ledger)**
- **DR-IDEM-001 (Idempotency Engine)**
- **DR-ERR-001 (Standard Error Envelope)**
- `docs/engineering/client-01/05_PAYMENT_CONTRACT.md`
- `docs/engineering/client-01/09_POS_API_CONTRACT.md`

## 8. Scope IN
- Tender modal component `src/components/pos/TenderModal.tsx`.
- Cash tender tab:
  - Total due display.
  - Cash tendered input field with currency formatting.
  - Quick-cash preset buttons (`Exact`, `+$50`, `+$100`, `+$200`, `+$500`).
  - Real-time "Cambio / Change Due" calculation.
  - Validation: submit disabled if cash tendered < total due.
- Card reference tab:
  - Total due display.
  - Authorization / Reference code input (minimum 4 characters).
  - Optional terminal selector and card brand selector.
- Submission state machine handling loading spinners, API errors (e.g. `INSUFFICIENT_STOCK`), and invoking `POST /api/pos/sales`.
- On success, pass order and receipt model to Receipt Modal (CCP-24).

## 9. Scope OUT
- Physical integration with card terminal hardware drivers or Bluetooth readers.
- Browser thermal receipt printing (handled in CCP-24).
- Offline queuing of uncommitted sales.

## 10. Required Behavior
1. Focus trap: upon opening, focus shifts immediately to the primary input field.
2. Quick buttons: clicking `Exact` populates cash tendered with the exact total due; clicking `+$100` adds 100 to the total.
3. Prevent submission while network request is in-flight (disable submit button, display spinner).
4. Error banner: if backend returns `409 INSUFFICIENT_STOCK`, display user-friendly message identifying the out-of-stock item and keep cart intact for adjustment.
5. On 201 Created: clear cart store and trigger receipt modal.

## 11. Inputs
- Cart items and calculated total from Zustand cart store.
- Cashier numerical inputs (amount tendered or terminal reference string).

## 12. Outputs
- HTTP POST request to `/api/pos/sales` containing `clientRequestId`, `items`, and `payment`.
- Emits `onSaleCompleted(orderData, receiptData)` callback.

## 13. Allowed Implementation Freedom
- Visual styling of denomination buttons and tab toggles using Soft Premium Tailwind tokens.
- Sound effects or haptic feedback triggers upon successful checkout (optional).

## 14. Forbidden Changes
- DO NOT allow submitting cash sales where tendered amount is less than total due.
- DO NOT generate or submit fake Stripe transaction identifiers.
- DO NOT clear cart before verifying `201 Created` HTTP response.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/components/pos/TenderModal.tsx`
  - `src/components/pos/CashTenderPanel.tsx`
  - `src/components/pos/CardReferencePanel.tsx`
  - `src/hooks/usePosSaleMutation.ts`
  - `tests/unit/components/tender-modal.test.tsx`
- **Strictly Prohibited**:
  - Backend API code or database migrations.

## 16. Data Impact
- Client-side modal state. Initiates backend transactional persistence via API.

## 17. API Impact
- Client consumer of `POST /api/pos/sales`.

## 18. Security
- Sanitizes reference code inputs.
- Never accepts raw PAN or CVV input fields.

## 19. Concurrency & Idempotency
- Uses a unique UUIDv4 `clientRequestId` generated per checkout attempt.
- Retries with the same `clientRequestId` in case of transient network timeouts to avoid duplicate orders.

## 20. Migration Considerations
- None. Modal conforms to canonical API contract.

## 21. Edge Cases
- Exact change: cash tendered equals total due; change due displays `$0.00 MXN`.
- Customer changes mind during payment: "Cancel" button closes modal, returning to cart without losing staged items.

## 22. Observability
- Emits console log or client telemetry event when sale submission begins and resolves.

## 23. Acceptance Criteria
- [ ] Change calculation is exact for decimal values (e.g. Total: 345.50, Tendered: 500.00 -> Change: 154.50).
- [ ] Submit button remains disabled if cash tendered is less than total.
- [ ] Card reference tab requires at least 4 characters to enable submit button.
- [ ] Displays clear error banner on backend 409 `INSUFFICIENT_STOCK`.
- [ ] Successfully triggers `onSaleCompleted` on 201 response.

## 24. Test Strategy
- React Testing Library unit tests verifying change calculation math, quick-button clicks, and API error state rendering.

## 25. Staging Validation
- Perform live cash and card reference checkouts on staging Web POS. Verify order persistence in backend.

## 26. Evidence Requirements
- Passing React Testing Library test execution log.
- Screenshots of Cash Tender and Card Reference panels with active inputs.

## 27. Definition of Done
- Modal fully integrated into POS register page.
- Zero accessibility violations on modal focus trap.
- Ready for Receipt UI integration (CCP-24).

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Rogelio (wire receipt modal in CCP-24).
