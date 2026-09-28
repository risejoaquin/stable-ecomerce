# Execution Pack: CCP-25 — Admin Inventory Management UI for SellableUnits

## 1. Responsibility
- **Lead Domain**: Frontend Engineering
- **Assignee Lead**: Rogelio (Frontend Lead)
- **Secondary Reviewer**: Julian (Backend Lead)

## 2. Objective
Upgrade the existing `/admin/inventory` and `/admin/products` interfaces in React to support managing discrete `SellableUnits` (SKUs, barcodes, price overrides, cost prices, and physical stock counts) under parent catalog products.

## 3. Why
Following the implementation of **DR-INV-001**, stock authority resides in `sellable_units` rather than monolithic product records. Store administrators must have an intuitive interface to create SKUs, adjust physical inventory, assign barcodes, and inspect real-time stock levels across all product variants.

## 4. Owner Profile
Senior React Frontend Engineer experienced in complex data tables, inline editing, modal forms, and TanStack React Query cache invalidation.

## 5. Preconditions
- CCP-12 (Inventory & SKU Schema Migrations) completed.
- Existing admin product screens in `src/pages/admin/` inspected.

## 6. Dependencies
- **Preceding Tickets**: CCP-12.
- **Downstream Blocking**: Operational sign-off for retail store management.

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority)**
- **DR-AUTH-001 (Authorization Model)**
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md`

## 8. Scope IN
- Enhancements to `src/pages/admin/AdminInventory.tsx` and product detail modals.
- Table view listing all `SellableUnits` with search, filter by product/status, and stock sorting.
- Quick stock adjustment dialog allowing increments/decrements with required audit reason (`restock`, `correction`, `manual_adjustment`).
- SKU and Barcode editing fields in product variant forms.
- Warning badges for units with low stock ($\le 5$) or out of stock ($= 0$).
- Backend route integration with `GET /api/admin/sellable-units` and `PATCH /api/admin/sellable-units/:id`.

## 9. Scope OUT
- Web POS cashier register interface (handled in CCP-22).
- Automated purchase order generation to suppliers.
- Multi-warehouse inventory routing.

## 10. Required Behavior
1. Protect page: accessible strictly to `owner` and `admin` roles.
2. Group units by parent product or display in flat, searchable table.
3. Allow inline or modal-based stock adjustments. Submitting an adjustment calls backend and invalidates React Query cache.
4. Require staff to select an adjustment reason whenever modifying stock counts.
5. Display unit SKU, barcode, title, current stock, and status badge (`active`, `archived`).

## 11. Inputs
- Staff search and filter interactions.
- Stock adjustment numerical values and reason strings.

## 12. Outputs
- HTTP requests: `GET /api/admin/sellable-units`, `PATCH /api/admin/sellable-units/:id`.
- Updated table view and optimistic UI feedback.

## 13. Allowed Implementation Freedom
- Table styling and pagination vs infinite scroll controls using Soft Premium theme components.
- Layout of the quick-edit stock drawer or modal.

## 14. Forbidden Changes
- DO NOT allow negative stock entries.
- DO NOT bypass audit reason logging when updating stock.
- DO NOT alter public storefront product catalog views.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/admin/AdminInventory.tsx`
  - `src/components/admin/inventory/*`
  - `src/hooks/useAdminInventory.ts`
  - `tests/unit/components/admin-inventory.test.tsx`
- **Strictly Prohibited**:
  - Storefront public components (`src/pages/storefront/*`).

## 16. Data Impact
- Triggers backend updates to `sellable_units.stock` and creates rows in `inventory_movements`.

## 17. API Impact
- Consumes `GET /api/admin/sellable-units` and `PATCH /api/admin/sellable-units/:id`.

## 18. Security
- Admin route guard blocks unauthorized roles.
- Input validation on SKU formats and stock boundaries.

## 19. Concurrency & Idempotency
- Uses optimistic concurrency control; displays conflict warning if stock was modified concurrently by another operator or sale.

## 20. Migration Considerations
- Displays both standalone product units and variant units created during CCP-12 backfill.

## 21. Edge Cases
- Rapid edits: debounce updates or use modal confirmation to prevent accidental multi-clicks.
- High variant counts ($> 50$ SKUs per product): implement efficient table virtualization.

## 22. Observability
- Staff actions logged to `audit_logs` via backend endpoints.

## 23. Acceptance Criteria
- [ ] Displays all active `SellableUnits` with accurate stock levels.
- [ ] Stock adjustments require selecting a valid audit reason.
- [ ] Barcodes can be added or updated cleanly without duplicates.
- [ ] Low-stock indicators highlight items needing replenishment.

## 24. Test Strategy
- React Testing Library tests for stock adjustment form, input validation, and reason selection.

## 25. Staging Validation
- Navigate to `/admin/inventory` on staging, adjust stock of a test unit, assert changes reflect in both admin table and database.

## 26. Evidence Requirements
- Passing unit test execution logs.
- Screenshot of Admin Inventory table showing SellableUnits and stock badges.

## 27. Definition of Done
- Admin UI fully functional and verified on staging.
- Zero TypeScript diagnostics.
- Approved by Frontend Lead.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Operations team for catalog management.
