# Execution Pack: CCP-29 — Storefront Stock Guard — Out-of-Stock Badging & Quantity Selector Limits

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Storefront Experience
- **Assignee Lead**: Julian (Frontend Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)

## 2. Objective
Implement canonical inventory guard components across the online storefront (product catalog cards, product detail pages, and cart quantity selectors), ensuring that out-of-stock badges (`Agotado`), low-stock indicators (`¡Últimas X piezas!`), and quantity selector caps reflect real-time `SellableUnit` availability, while strictly enforcing the architectural invariant that frontend availability is advisory only and server/database row locks remain authoritative.

## 3. Why
Fulfills **DR-INV-001** and prevents customer checkout frustration. When storefront customers see stale stock indicators, they attempt to purchase items that have already been sold in physical stores via Web POS cashiers. Displaying advisory stock badges and capping cart quantities at known availability dramatically reduces race conditions and checkout aborts, while ensuring that unexpected concurrent exhaustion is gracefully caught by `DR-ERR-001`.

## 4. Owner Profile
Senior React / Frontend UI Engineer with expertise in component state synchronization, responsive accessibility badging, input validation, and resilient error state presentation.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- CCP-39 (SellableUnit Foundation) and CCP-12 (Inventory Concurrency RPC) completed.
- Catalog and product detail pages operational in `src/pages/store/`.

## 6. Dependencies
- **Preceding Tickets**: CCP-39, CCP-12.
- **Downstream Blocking**: Blocks CCP-15 (Storefront Checkout Flow) and CCP-35 (Feature Freeze Enforcement).

## 7. Authoritative Contracts
- **DR-INV-001 (Canonical Inventory Authority — Advisory Frontend Principle)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md`

## 8. Scope IN
- Authoring / adapting `src/components/store/StockBadge.tsx`:
  - When SellableUnit `stock === 0`: render red badge `"Agotado"`, disable "Agregar al Carrito" button, and prevent quantity increment.
  - When `0 < stock <= 3`: render amber badge `"¡Solo quedan {stock} piezas!"`.
  - When `stock > 3`: render standard availability status or in-stock indicator.
- Adapting quantity selector in `src/pages/store/ProductDetailPage.tsx` and `src/components/store/CartDrawer.tsx`:
  - Enforce `max = sellableUnit.stock`.
  - If user types a number higher than stock, auto-clamp to max available and display tooltip alert.
- Ensuring option selectors (size, color) dynamically resolve to the exact `SellableUnit` and update stock badges immediately.
- Clean handling of server rejection: if item is sold concurrently before checkout, handle HTTP 409 `INSUFFICIENT_STOCK` by showing a clean dialog and updating the advisory badge.
- Eliminating all direct assumptions or queries against legacy `variants[*].stock`.
- Component and unit tests in `tests/frontend/storefront-stock-guard.test.tsx`.

## 9. Scope OUT
- Server-side stock deduction stored procedures (handled in CCP-12).
- Admin stock adjustment modal (handled in CCP-21).
- POS cashier register UI (handled in CCP-43).

## 10. Required Behavior
1. In product catalog grid (`ProductsPage.tsx`) and product detail page (`ProductDetailPage.tsx`), selecting variant attributes resolves to a specific `sellable_unit_id`.
2. The UI reads the `stock` property of the resolved SellableUnit.
3. If stock is 0, the primary CTA button changes to "Agotado" and is disabled (`disabled={true}`).
4. If stock is between 1 and 3, an alert indicates limited availability.
5. In the cart drawer, the quantity `+` button is disabled when cart quantity equals available stock.
6. If an engineer or malicious client bypasses the frontend limit, the server rejects the checkout atomically; the frontend catches `INSUFFICIENT_STOCK` and displays an informative notification.

## 11. Inputs
- `SellableUnit` object `{ id, productId, sku, stock, active }`.
- User selection of variant attributes.

## 12. Outputs
- Rendered badges (`Agotado`, `Últimas piezas`).
- Constrained `<input type="number">` or counter buttons.

## 13. Allowed Implementation Freedom
- Visual badge styling (e.g. pill vs tag badge, icon selection).
- Tooltip animation on quantity clamping.

## 14. Forbidden Changes
- ABSOLUTE PROHIBITION: DO NOT treat frontend stock checks as authoritative; server-side database locks are the sole transactional authority.
- DO NOT query or mutate legacy `products.variants[*].stock`.
- DO NOT silently discard items from the cart without notifying the customer.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/components/store/StockBadge.tsx`
  - `src/pages/store/ProductDetailPage.tsx`
  - `src/components/store/CartDrawer.tsx`
  - `src/hooks/useCart.ts`
  - `tests/frontend/storefront-stock-guard.test.tsx`
- **Strictly Prohibited**:
  - Server endpoints or database migration scripts (Rogelio domain).

## 16. Data Impact
- Read-only consumption of SellableUnit stock. Zero database writes.

## 17. API Impact
- Consumes `GET /api/products` and `GET /api/sellable-units`.

## 18. Security
- Eliminates client-side injection vulnerabilities; quantity inputs strictly parsed as positive integers.

## 19. Concurrency & Idempotency
- Component state gracefully synchronizes with server re-validation on cart drawer open or page focus.

## 20. Migration Considerations
- If product has no variant options, maps directly to root SellableUnit.

## 21. Edge Cases
- Stock changes from 1 to 0 while customer is viewing detail page: clicking "Comprar" triggers server rejection; client immediately refreshes badge to "Agotado" and disables button.
- User pastes large number into quantity input: input `onChange` parses `Math.min(parseInt(val), stock)`.

## 22. Observability
- Emits telemetry event `stock_guard_clamped` when user attempts to add more items than available.

## 23. Acceptance Criteria
- [ ] Selected purchasable configuration resolves to an exact `SellableUnit`.
- [ ] Out-of-stock configuration renders disabled "Agotado" button.
- [ ] Low-stock configuration (1-3 units) displays warning banner.
- [ ] Cart quantity selector prevents incrementing beyond known available stock.
- [ ] Checkout race rejection (`INSUFFICIENT_STOCK`) presents clear user message without unhandled error.
- [ ] No direct legacy `variants[*].stock` assumptions remain.
- [ ] Component tests in `tests/frontend/storefront-stock-guard.test.tsx` pass 100%.

## 24. Test Strategy
- Vitest + React Testing Library tests verifying variant selection stock binding, button disabled states, input clamping, and error response handling.

## 25. Staging Validation
- Find an item with 1 unit remaining on Railway staging, add to cart, verify cannot increment to 2, complete purchase on POS to reach 0 stock, verify storefront page reflects "Agotado" upon refresh.

## 26. Evidence Requirements
- Component test execution output showing 100% assertions green.
- Screenshot of out-of-stock badge and quantity selector clamping in browser.

## 27. Definition of Done
- Stock guards implemented and tested.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for integration with Storefront Checkout Flow (CCP-15).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Julian (proceed to CCP-15 Storefront Checkout Flow) and QA Lead (CCP-33 E2E automation).
