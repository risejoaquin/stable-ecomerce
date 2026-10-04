# Execution Pack: CCP-21 — Admin Catalog UI — Stock Adjustment & Sellable Unit Inventory Management

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Admin Command Center
- **Assignee Lead**: Julian (Frontend Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)

## 2. Objective
Enhance the existing Admin Catalog interface (`ProductTable.tsx`, `ProductsPage.tsx`) by integrating a dedicated "Ajustar Stock" modal connected to the backend inventory adjustment API (`POST /api/inventory/adjustments`), requiring signed quantity adjustments, mandatory reason code selection, and immediate stock view refresh without page reload, while preserving existing product CRUD workflows intact.

## 3. Why
Fulfills **DR-INV-001** and backoffice operational requirements. Store managers and warehouse staff need a fast, intuitive UI to record manual inventory changes (restocking shipments, defective product write-offs, physical inventory count reconciliation) without having to manually edit product records or directly query the database.

## 4. Owner Profile
Senior React / TypeScript Frontend Engineer with expertise in modal dialog workflows, form validation via React Hook Form / Zod, optimistic UI updates, and Tailwind UI design systems.

## 5. Preconditions
- Products catalog view (`ProductsPage.tsx`, `ProductTable.tsx`, `useProducts.ts`) operational in repository.
- CCP-20 (`POST /api/inventory/adjustments`) API contract frozen and available.
- Staff authentication context (`useAuth`) verifying admin permissions.

## 6. Dependencies
- **Preceding Tickets**: CCP-20 (Stock Adjustment API), CCP-39 (SellableUnit Foundation).
- **Downstream Blocking**: Blocks CCP-35 (Feature Freeze Enforcement) and CCP-37 (Client UAT).

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority & Movement Ledger)**
- **DR-AUTH-001 (Admin Access Protection)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md`

## 8. Scope IN
- Adding an "Ajustar Stock" action button to product rows in `src/components/admin/ProductTable.tsx`.
- Authoring `src/components/admin/StockAdjustmentModal.tsx` containing:
  - Product name and current stock display.
  - SellableUnit selection dropdown (if product has multiple SKU variants).
  - Quantity delta input field (signed integer, positive for restock, negative for deduction).
  - Reason code selector dropdown (`restock`, `damage`, `shrinkage`, `audit`).
  - Optional notes textarea.
  - Submitting state spinner and disabled submit button during flight.
- Invoking `POST /api/inventory/adjustments` with sanitized payload.
- Triggering react-query / cache invalidation or local state update to refresh stock numbers seamlessly without page reload.
- Unit and component tests under `tests/frontend/admin-stock-adjustment-modal.test.tsx`.

## 9. Scope OUT
- Rebuilding product creation, editing, or deletion forms (already existing in `ProductFormModal.tsx`).
- Modifying backend adjustment transaction logic (handled in CCP-20).
- Building POS terminal UI (handled in CCP-43).

## 10. Required Behavior
1. In `ProductTable.tsx`, each product row renders an "Ajustar Stock" button accessible strictly to staff with `owner` or `admin` roles.
2. Clicking "Ajustar Stock" opens `StockAdjustmentModal.tsx` focused on the selected product.
3. Form validation prevents submission if delta is 0 or non-numeric, or if reason is unselected.
4. If negative delta exceeds current stock, display client warning: "El ajuste no puede dejar el stock en números negativos."
5. On successful submission, close modal, display success toast ("Stock ajustado correctamente"), and update product row stock count.
6. On error, display standard backend error message from `DR-ERR-001` envelope.

## 11. Inputs
- Selected product and associated `SellableUnit` records.
- User input: delta integer, reason code, notes.

## 12. Outputs
- HTTP POST request to `/api/inventory/adjustments`.
- Updated product inventory view in admin table.

## 13. Allowed Implementation Freedom
- Modal positioning, button icon choice (e.g. Lucide `Boxes` or `Sliders`), and toast styling.
- Quick preset buttons for adjustments (+1, +5, +10, -1).

## 14. Forbidden Changes
- DO NOT rebuild or refactor existing working CRUD code in `ProductFormModal.tsx` or `ProductsPage.tsx`.
- DO NOT allow submitting adjustments without a selected reason code.
- DO NOT execute direct database updates or bypass the backend API.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/components/admin/ProductTable.tsx`
  - `src/components/admin/StockAdjustmentModal.tsx`
  - `src/hooks/useProducts.ts` (adding adjustment mutation)
  - `tests/frontend/admin-stock-adjustment-modal.test.tsx`
- **Strictly Prohibited**:
  - Express server routes or database migration files (Rogelio domain).

## 16. Data Impact
- Dispatches mutation to `POST /api/inventory/adjustments`.
- No local database schema changes.

## 17. API Impact
- Consumes `POST /api/inventory/adjustments`.

## 18. Security
- Modal rendering and action buttons protected by staff authorization checks (`admin` or `owner` role).

## 19. Concurrency & Idempotency
- Multiple simultaneous adjustments by different admins are serialized and handled by backend row locks; UI reflects final committed state upon re-fetch.

## 20. Migration Considerations
- Supports both single-unit products and multi-variant SellableUnits seamlessly.

## 21. Edge Cases
- Admin opens adjustment modal, but another user adjusts stock concurrently: backend returns conflict or new stock; UI refreshes on completion.
- Network disconnection during submission: clean retry prompt displayed without corrupting table state.

## 22. Observability
- Emits user action event `admin_stock_adjustment_submitted` with product ID and reason code.

## 23. Acceptance Criteria
- [ ] `ProductTable.tsx` renders 'Ajustar Stock' button on each product row for authorized staff.
- [ ] Clicking button opens adjustment modal showing current stock and requiring quantity delta and reason code.
- [ ] Form validation prevents blank reasons or non-numeric quantities.
- [ ] Submitting modal invokes `POST /api/inventory/adjustments` and updates displayed stock without page reload.
- [ ] Automated tests in `tests/frontend/admin-stock-adjustment-modal.test.tsx` pass 100%.

## 24. Test Strategy
- Vitest + React Testing Library tests verifying modal open/close, input validation, reason selection, API mutation call, and table cache refresh.

## 25. Staging Validation
- Open Admin Portal on Railway staging, locate product, click "Ajustar Stock", add +5 units with reason `restock`, verify stock increases by 5 without browser reload.

## 26. Evidence Requirements
- Component test execution logs with 100% assertions green.
- Screenshot or recording of adjustment modal submission on staging.

## 27. Definition of Done
- Modal integrated and all acceptance criteria verified.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for inclusion in Feature Freeze candidate (CCP-35).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: QA Lead (CCP-35 Staging Verification & CCP-37 Client UAT).
