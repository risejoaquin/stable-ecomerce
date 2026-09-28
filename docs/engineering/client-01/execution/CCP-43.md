# Execution Pack: CCP-43 — Web POS Register UI — Product Search, Cart, Tender & Sale Submission

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Web POS Presentation Layer
- **Assignee Lead**: Julian (Frontend Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)
- **Technical & Release Authority**: Joaquin (@risejoaquin)

## 2. Objective
Author and verify the comprehensive Web POS cashier terminal register interface in `src/pages/pos/` and `src/components/pos/`, encompassing the full in-store checkout lifecycle: fast catalog search, barcode scanning, cart adjustments, cash tender with change calculation, external card reference entry, idempotent submission via `POST /api/pos/sales`, deterministic error presentation (`DR-ERR-001`), and seamless transition into the digital receipt view (`CCP-27`).

## 3. Why
Fulfills **DR-AUTH-001**, **DR-INV-001**, **DR-PAY-001**, **DR-IDEM-001**, and **DR-ERR-001** for in-person retail. Web POS is the flagship physical retail capability for Client 01. Store cashiers need an ergonomic, ultra-fast interface optimized for desktop and touch tablet operation, capable of scanning items, entering tender, computing change with zero arithmetic mistakes, and finalizing sales in sub-800ms while keeping inventory perfectly synchronized with the online storefront.

## 4. Owner Profile
Senior React / TypeScript Frontend Engineer with expertise in point-of-sale register workflows, numeric keypad input handling, rapid barcode scanner input buffers, accessibility, and resilient transactional UI state machines.

## 5. Preconditions
- Julian TEAM-READY validated (CCP-41).
- Contract Freeze gate (CCP-44) approved.
- SellableUnit foundation (CCP-39) and database migrations (CCP-12) completed.
- Canonical Orders and Payment Ledger schema (CCP-13) completed.
- Web POS Sale API (`POST /api/pos/sales` / CCP-14) contract frozen and available.
- POS Operator RBAC middleware (`requirePosOperator` / CCP-22) active.

## 6. Dependencies
- **Preceding Tickets**: CCP-41, CCP-44, CCP-39, CCP-12, CCP-13, CCP-14, CCP-22.
- **Downstream Blocking**: Blocks CCP-27 (Web POS Receipt View), CCP-33 (Critical Path E2E Automation), and CCP-34 (Pre-Freeze System Validation).

## 7. Authoritative Contracts
- **DR-AUTH-001 (Web POS Operator RBAC & Route Protection)**
- **DR-INV-001 (Canonical Inventory Authority — Row Lock Decrements)**
- **DR-PAY-001 (Payment Ledger — Cash & Card Reference Tenders)**
- **DR-IDEM-001 (PostgreSQL Durable Idempotency)**
- **DR-ERR-001 (Canonical Error Envelope)**
- **DR-REC-001 (Receipt Read Model)**
- `docs/engineering/client-01/09_POS_API_CONTRACT.md`

## 8. Scope IN
- POS Register Shell (`src/pages/pos/PosRegisterPage.tsx`):
  - Two-pane layout: Catalog search & grid on left (60%), Active cart & tender pane on right (40%).
  - Fast barcode input listener with 50ms buffer detection for USB barcode scanners.
  - Search input with debounced text search resolving discrete `SellableUnit`s.
- Active Cart Management (`src/components/pos/PosCart.tsx`):
  - Item listing with SKU, title, variant options (size/color), unit price, and quantity stepper (+ / -).
  - Quick remove item button.
  - Real-time subtotal, tax calculation (16% IVA), and grand total display.
  - "Limpiar Venta" (Clear Cart) button with confirmation guard.
- Tender Modal (`src/components/pos/PosTenderModal.tsx`):
  - **Cash Tender Tab**: Numeric keypad, quick-cash buttons ($100, $200, $500, Exacto), real-time change calculation (`change = tendered - total`). Blocks submission if tendered < total.
  - **Card Reference Tab**: Terminal authorization reference input field (4-12 alphanumeric characters) verifying external payment terminal slip.
- Idempotent Sale Submission:
  - Generates UUID v4 `clientRequestId` upon opening tender modal.
  - Submits payload to `POST /api/pos/sales` with header `x-client-request-id`.
  - Disables submit button during flight with loading spinner.
  - Catches errors and displays deterministic modal alerts:
    - `INSUFFICIENT_STOCK`: indicates which item is exhausted and refreshes cart.
    - `INVALID_TENDER`: displays tender validation error.
    - `UNAUTHORIZED` / `FORBIDDEN`: redirects to login or informs of expired session.
- Success Callback:
  - Clears active cart.
  - Immediately transitions to `ReceiptModal.tsx` (CCP-27) passing confirmed order and receipt read model.
- Component and integration tests under `tests/frontend/pos-register.test.tsx`.

## 9. Scope OUT
- Backend endpoint implementation (handled in CCP-14).
- Database migrations and stored procedures (handled in CCP-12).
- Thermal receipt printer ESC/POS driver integration (browser print handled in CCP-27).
- Storefront online ecommerce checkout (handled in CCP-15).

## 10. Required Behavior
1. Opening `/pos` checks user session; if user is not `owner` or `admin`, redirect to `/unauthorized`.
2. Scanning a barcode or typing in search instantly adds the matching `SellableUnit` to the cart. If already present, increment quantity by 1.
3. Prices displayed in the cart are loaded from backend metadata, but final transactional prices are resolved authoritatively by the server.
4. Clicking "Cobrar" opens the tender modal.
5. In Cash mode, typing 500 for a 450 sale displays "$50.00 Cambio". The "Finalizar Venta" button becomes active.
6. In Card mode, typing auth code "AUTH-8821" enables "Finalizar Venta".
7. On submission, the client sends:
   ```json
   {
     "clientRequestId": "uuid-v4",
     "channel": "pos",
     "posTerminalId": "term-01",
     "items": [
       { "sellableUnitId": "uuid-unit", "quantity": 1 }
     ],
     "payments": [
       {
         "channel": "cash",
         "amount": 450.00,
         "cashTendered": 500.00,
         "changeDue": 50.00
       }
     ]
   }
   ```
8. On HTTP 200/201 response, close tender modal, clear cart, and open `ReceiptModal.tsx`.

## 11. Inputs
- Cashier interaction (barcode scan, mouse click, touch tap, numeric entry).
- Catalog SellableUnit fixtures or API responses.

## 12. Outputs
- HTTP POST request to `/api/pos/sales`.
- Clean UI transitions into receipt view.

## 13. Allowed Implementation Freedom
- Keyboard shortcuts for cashier efficiency (e.g. `F2` to focus search, `F8` to open cash tender, `Esc` to close modal).
- Touch target sizing (minimum 44px for tablet friendliness).
- Color accents conforming to platform brand guidelines.

## 14. Forbidden Changes
- ABSOLUTE PROHIBITION: DO NOT treat frontend pricing, subtotal arithmetic, or stock as authoritative; server is the sole financial authority.
- DO NOT permit checkout submission with cash tendered less than grand total.
- DO NOT hardcode cashier names or store IDs; load dynamically from authenticated session.
- DO NOT introduce duplicate product or cart state primitives outside `usePosCart`.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/pos/PosRegisterPage.tsx`
  - `src/components/pos/PosCart.tsx`
  - `src/components/pos/PosTenderModal.tsx`
  - `src/components/pos/PosCatalogSearch.tsx`
  - `src/hooks/usePosCart.ts`
  - `tests/frontend/pos-register.test.tsx`
- **Strictly Prohibited**:
  - Express route handlers, database DDL, or backend RPCs (Rogelio domain).

## 16. Data Impact
- Dispatches transactional sale payload to `POST /api/pos/sales`.
- Manages ephemeral cart state in React context / Zustand store.

## 17. API Impact
- Consumes `POST /api/pos/sales`, `GET /api/pos/catalog/search`, and `GET /api/pos/sellable-units/lookup`.

## 18. Security
- Route protected by `DR-AUTH-001` guards.
- No sensitive credentials, private keys, or raw Stripe tokens used in POS UI.
- All text inputs sanitized against XSS.

## 19. Concurrency & Idempotency
- Generates a single unique UUID `clientRequestId` when the tender modal is opened.
- If network hiccups occur and the cashier retries submission, the same `clientRequestId` is sent, guaranteeing that backend row locks and idempotency filters prevent double-billing or double-decrementing stock.

## 20. Migration Considerations
- Can operate against real backend or contract-generated MSW / Vitest mock fixtures during isolated testing.

## 21. Edge Cases
- Item scanned has 0 stock on server: backend returns HTTP 409 `INSUFFICIENT_STOCK`; UI highlights the out-of-stock item and alerts cashier.
- Cashier enters letters in cash amount: input parser strips non-numeric characters automatically.
- Barcode scanner inputs text rapidly followed by Enter key: buffer listener intercepts event without triggering accidental form submit.

## 22. Observability
- Emits client performance metrics: time from cart creation to tender completion, search query latency, and checkout error counts.

## 23. Acceptance Criteria
- [ ] Product and barcode search resolves exact `SellableUnit` SKUs and options.
- [ ] Cart management allows adding, updating quantity, and removing line items.
- [ ] UI never treats frontend prices or stock counts as transactional authority.
- [ ] Cash tender validates tendered >= total and accurately displays change due.
- [ ] External card tender requires valid authorization reference code.
- [ ] Submit generates/reuses UUID `clientRequestId` for idempotency.
- [ ] Canonical API error codes (`INSUFFICIENT_STOCK`, `UNAUTHORIZED`) map to deterministic, user-friendly modals.
- [ ] Successful sale clears cart and transitions seamlessly into Receipt view (CCP-27).
- [ ] No private or secret backend credentials exposed in client bundle.
- [ ] Component and integration tests in `tests/frontend/pos-register.test.tsx` pass 100%.

## 24. Test Strategy
- Vitest + React Testing Library component tests validating barcode scanning buffer, cart calculations, tender modal tabs, error dialogues, and receipt transition.

## 25. Staging Validation
- Open Web POS on Railway staging using iPad or desktop Chrome.
- Scan or search for test product, add to cart, select cash tender, enter $500 for $450 sale, verify change display, submit sale, and verify receipt modal displays immediately.

## 26. Evidence Requirements
- Component test execution transcript showing 100% assertions green.
- Video or screenshot walkthrough of complete Web POS sale lifecycle on staging.

## 27. Definition of Done
- Web POS register UI fully implemented and tested.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for integration with Critical Path E2E Automation Suite (CCP-33).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Julian (proceed to CCP-27 Receipt View) and QA Lead (CCP-33 Critical Path E2E Suite).
