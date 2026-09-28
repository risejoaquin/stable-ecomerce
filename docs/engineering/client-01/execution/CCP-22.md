# Execution Pack: CCP-22 — Web POS Frontend Sale Terminal UI

## 1. Responsibility
- **Lead Domain**: Frontend Engineering
- **Assignee Lead**: Rogelio (Frontend Lead)
- **Secondary Reviewer**: Julian (Backend Lead)

## 2. Objective
Build the responsive, touchscreen-friendly, high-contrast Web POS cashier register interface in React 19 / Vite, featuring quick-search catalog selection, live cart staging, cashier state, and checkout action triggers.

## 3. Why
Physical store cashiers need an intuitive, fast, web-based register terminal accessible via staff tablets or desktop computers. The UI must provide rapid item selection, keyboard/scanner inputs, and smooth transitions into tender collection.

## 4. Owner Profile
Senior React / Frontend Engineer with expertise in React 19, Tailwind CSS, touch interactions, accessibility standards, and state management via Zustand.

## 5. Preconditions
- CCP-14 (POS Sales Backend API) and CCP-15 (POS Search & Catalog Read) completed.
- Design tokens and theme guidelines from `docs/design/UIX04_ADMIN_THEME_GUIDE.md` reviewed.

## 6. Dependencies
- **Preceding Tickets**: CCP-14, CCP-15.
- **Downstream Blocking**: Blocks CCP-23 (POS Cash & Card Tender) and CCP-33 (POS Sales E2E Suite).

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority)**
- **DR-AUTH-001 (Authorization Model)**
- `docs/engineering/client-01/09_POS_API_CONTRACT.md`

## 8. Scope IN
- Page route `/admin/pos` and register layout `src/pages/admin/pos/PosRegisterPage.tsx`.
- Fast search bar component with barcode scanner listener (`keydown` event listener).
- Cart panel displaying staged line items, quantity adjustment (+/-), and item deletion.
- Cashier session header displaying active user name and store identifier.
- Cart totals display (advisory subtotal and total calculated locally for immediate feedback).
- "Cobrar / Tender" primary action button triggering tender modals.
- Route protection checking staff role (`owner` or `admin`).

## 9. Scope OUT
- Tender modals implementation (handled in CCP-23).
- Thermal receipt view and printing modal (handled in CCP-24).
- Offline SQLite storage (explicitly excluded).

## 10. Required Behavior
1. Protect route: redirect unauthorized users (`user`, `support`) to `/admin` or home with warning.
2. Fast product search: as cashier types, query `GET /api/pos/catalog/search?q=...` with debounce (150ms).
3. Barcode support: capture rapid keystrokes followed by Enter key to auto-add item to cart.
4. Cart state: persist in Zustand memory store (`src/stores/pos-cart-store.ts`).
5. Disallow adding items beyond advisory available stock.
6. Display currency in Mexican Pesos (`$XX.XX MXN`).

## 11. Inputs
- Cashier keyboard / barcode scanner keystrokes, touch clicks.
- Catalog items fetched from `GET /api/pos/catalog/search`.

## 12. Outputs
- Staged cart state in Zustand store.
- Event emitted to open Tender Modal (CCP-23) with cart items payload.

## 13. Allowed Implementation Freedom
- Internal component factoring within `src/components/pos/`.
- Keyboard shortcuts configuration (e.g. `F2` to focus search, `Space` to open tender).

## 14. Forbidden Changes
- DO NOT rely on client-side cart prices as authoritative for final transaction settlement.
- DO NOT allow access to POS page if user is not `owner` or `admin`.
- DO NOT implement external native hardware drivers.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/admin/pos/*`
  - `src/components/pos/*`
  - `src/stores/pos-cart-store.ts`
  - `src/routes/lazy-routes.tsx`
  - `tests/unit/components/pos-register.test.tsx`
- **Strictly Prohibited**:
  - Backend API handlers or database migrations.

## 16. Data Impact
- Client-side in-memory Zustand state. No direct database writes from this component.

## 17. API Impact
- Consumes `GET /api/pos/catalog/search` and `GET /api/pos/units/:id`.

## 18. Security
- Route guard validates user role from auth token before rendering.
- Input sanitization on search queries.

## 19. Concurrency & Idempotency
- Generates a new `clientRequestId` (UUIDv4) upon initiating a new checkout session.

## 20. Migration Considerations
- Feature flagged under `ENABLE_WEB_POS`. Route hidden when flag is false.

## 21. Edge Cases
- Rapid double-scanning of same barcode: increments item quantity rather than duplicating row.
- Search with network latency: shows loading skeleton, ignores out-of-order search responses.

## 22. Observability
- Client-side performance markers tracking time from search input to result render.

## 23. Acceptance Criteria
- [ ] Non-staff users cannot access `/admin/pos`.
- [ ] Product search displays results in under 150ms on standard network.
- [ ] Barcode scanning automatically adds matching unit to cart.
- [ ] Quantity adjustments update totals dynamically.
- [ ] Clicking "Cobrar" opens tender modal with correct item summary.

## 24. Test Strategy
- Vitest + React Testing Library tests for search debounce, cart increment/decrement, and barcode capture.

## 25. Staging Validation
- Test terminal on desktop and iPad viewport in staging. Scan mock barcodes.

## 26. Evidence Requirements
- Passing React Testing Library test execution output.
- Screenshots of the POS register UI in desktop and tablet viewports.

## 27. Definition of Done
- Components built with zero TypeScript diagnostics.
- Responsive layout verified on mobile, tablet, and desktop breakpoints.
- Ready for CCP-23 tender integration.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Rogelio (proceed to CCP-23 for Tender UI).
