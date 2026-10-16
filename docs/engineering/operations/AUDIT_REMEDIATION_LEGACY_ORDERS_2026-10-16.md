# Sprint remediation — Wave 3: legacy web order / checkout guard

**Scope:** temporary pre-cutover hardening. Base `main`. No database migration, SQL write, live transaction or production deployment performed.

## Verified defect

The existing `POST /api/orders` uses `storeId` from the client and fetches product by UUID only. It allows products outside the primary merchant store, uses fuzzy variant name matching, and can silently fall back to parent product stock/price when an explicit variant cannot be matched. Separately, `POST /api/checkout` checks only product aggregate stock per line, ignoring variants and repeated order-item quantities. `order_items` insert errors were ignored even though a success response could follow.

## Limited defense added

- Reject client-requested cross-store IDs; use primary store as the only source of order scope.
- Retrieve only active products for the primary store.
- Identify explicit variants using product-owned name and/or SKU; reject missing, mismatched, duplicate/ambiguous, and stale selections. Never trust client-supplied line prices or names.
- Aggregate repeated line quantities at order creation and at Stripe checkout preflight.
- Fail the order creation response when order items do not persist; no Stripe session is started by that failed request.
- Add unit regressions and checks for server route integration.

## Important non-goals / remaining release blockers

This is **not** an atomic stock reservation and is **not** zero-oversell proof. Between this precheck and payment finalization another buyer may spend stock. `products.stock` and JSONB variant stock remain **advisory/legacy** until DR-INV-001 Phase 4 cutover. Do not claim variant ledger correctness from these tests.

The authorized permanent fix must make `sellable_units` the exclusive authority, backfill and reconcile `order_items.sellable_unit_id` (CCP-12, CCP-13), and provide transaction-safe payment finalization, idempotency, inventory exception and refund integration under concurrent PostgreSQL tests. Legacy order creation still comprises separate `orders` and `order_items` statements; a failure may leave an unpayable orphan `pendiente` order for reconciliation. The permanent backend mutation should use a single transactional RPC, not an unreliable compensating delete.

Do not cherry-pick this into production before validating existing historical order snapshot variants and storefront cart behavior, including PR #40. Merge only after independent review/CI and explicit PO approval.
