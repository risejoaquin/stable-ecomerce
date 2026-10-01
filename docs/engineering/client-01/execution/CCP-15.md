# Execution Pack: CCP-15 — Storefront Checkout Flow — Atomic Stock Decrement, Soft Check & Compensating Path UI

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Storefront Experience
- **Assignee Lead**: Julian (Frontend Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)

## 2. Objective
Harden the existing online ecommerce storefront checkout flow so that it strictly consumes the canonical `SellableUnit` availability, omnichannel order persistence (`orders`), and standardized error envelopes (`DR-ERR-001`), ensuring robust advisory stock pre-checks, Stripe checkout payment handling, idempotent submission, clear decline/3DS presentation, and observable handling of `inventory_exception` compensating workflows.

## 3. Why
Fulfills **DR-INV-001**, **DR-PAY-001**, **DR-IDEM-001**, and **DR-ERR-001** for online retail. Previously, the storefront relied on loose JSONB variant fields and uncoordinated stock checks. To prevent overselling against concurrent in-store Web POS cashiers, the online checkout must resolve to discrete SellableUnits, treat frontend stock as advisory, handle server inventory rejections deterministically, and guide the customer through compensating recovery without silent errors.

## 4. Owner Profile
Senior React / TypeScript Frontend Engineer with expertise in Stripe Elements / Checkout integration, optimistic UI states, async form submission guards, accessible status alerts, and resilient error recovery patterns.

## 5. Preconditions
- CCP-41 (Julian TEAM-READY) verified.
- CCP-44 (Contract Freeze) approved.
- CCP-39 (SellableUnit Foundation), CCP-12 (Concurrency Decrement RPC), and CCP-13 (Unified Order Persistence) contracts frozen.
- CCP-29 (Storefront Stock Guard) availability contract reviewed.

## 6. Dependencies
- **Preceding Tickets**: CCP-41, CCP-44, CCP-39, CCP-12, CCP-13, CCP-29.
- **Downstream Blocking**: Blocks CCP-24 (Order Confirmation & Status Tracking) and CCP-33 (Critical Path E2E Automation).

## 7. Authoritative Contracts
- **DR-INV-001 (Canonical Inventory Authority)**
- **DR-PAY-001 (Payment Ledger & Channels)**
- **DR-IDEM-001 (PostgreSQL Durable Idempotency)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/04_ORDER_CONTRACT.md`
- `docs/engineering/client-01/05_PAYMENT_CONTRACT.md`

## 8. Scope IN
- Integration of canonical `SellableUnit` resolution in `src/pages/store/CheckoutPage.tsx` and cart drawers.
- Advisory pre-checkout availability verification via `/api/inventory/availability` probe.
- Preservation of Stripe Elements payment execution (`/api/create-payment-intent`).
- UI duplicate submission prevention (disabling submit button, generating UUID `client_request_id` idempotency key).
- Deterministic handling and presentation of Stripe card declines, 3D-Secure authentication challenges, and network timeouts.
- Observable handling of `inventory_exception` response: displaying clear customer explanation and routing to support or compensating alternatives.
- Component and integration tests for checkout state machine under `tests/frontend/checkout-flow.test.tsx`.

## 9. Scope OUT
- Web POS cashier checkout (CCP-43 / CCP-14).
- Stripe webhook signature verification (CCP-17 / existing `src/server/stripe-webhook.ts`).
- Modifying database DDL or stored procedures (CCP-12 / CCP-13).

## 10. Required Behavior
1. Every purchasable item in the cart resolves to a specific `sellable_unit_id`.
2. Before checkout submission, perform a non-blocking advisory stock check; if advisory stock is 0, alert user immediately.
3. On "Pagar Ahora" click, generate or preserve a unique `client_request_id` (UUID v4) and disable the submission button to prevent double-charging.
4. If payment succeeds and inventory is reserved, redirect to `CheckoutSuccessPage.tsx` with confirmed `order_id`.
5. If backend returns `409 CONFLICT` with code `INSUFFICIENT_STOCK`, present a clear dialog: "Uno o más artículos en tu carrito acaban de agotarse. Tu tarjeta no ha sido cobrada."
6. If an asynchronous inventory race triggers `inventory_exception` post-payment, route to `TrackOrderPage.tsx` with a reassurance alert that our staff is reviewing fulfillment.

## 11. Inputs
- Cart line items `{ sellable_unit_id, quantity, productId }`.
- Customer shipping and contact information.
- Stripe payment method / token.
- `client_request_id` (UUID v4).

## 12. Outputs
- Completed order confirmation with canonical order number.
- Navigation to `/store/order-success?order_id=UUID`.
- Error messages conforming to `DR-ERR-001`.

## 13. Allowed Implementation Freedom
- Loading spinner animations and micro-interactions on the checkout button.
- Field layout ordering within the checkout form.
- Toast vs banner visual styling for non-fatal advisory warnings.

## 14. Forbidden Changes
- DO NOT rely on legacy `products.variants[*].stock` or `products.stock` as transactional authority.
- DO NOT bypass server-side price validation or attempt client-side price computation as authority.
- DO NOT silently catch or hide `inventory_exception` errors.
- DO NOT introduce alternate payment gateways (Stripe remains the sole online payment provider).

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/store/CheckoutPage.tsx`
  - `src/components/store/CartDrawer.tsx`
  - `src/components/store/CheckoutSummary.tsx`
  - `src/hooks/useCheckout.ts`
  - `tests/frontend/checkout-flow.test.tsx`
- **Strictly Prohibited**:
  - `server.ts` or database migration directories (Rogelio domain).

## 16. Data Impact
- Submits structured checkout payloads matching `POST /api/checkout` or `/api/orders`.
- No local database mutations; strictly interacts through REST APIs.

## 17. API Impact
- Consumes `POST /api/create-payment-intent` and `POST /api/orders/checkout`.
- Sends `Idempotency-Key` or `client_request_id` header with every transactional POST.

## 18. Security
- Credit card details processed exclusively via Stripe Elements iframe; zero PAN data touches application memory.
- Customer authentication session or guest checkout email sanitized against XSS.

## 19. Concurrency & Idempotency
- UI generates a unique UUID `client_request_id` per checkout session.
- Retries with the same `client_request_id` return the existing order rather than creating duplicate orders or duplicate Stripe payment intents.

## 20. Migration Considerations
- Operates during transitional Phase 1: if a product lacks discrete `sellable_units` in legacy mode, fallback to product root unit without breaking checkout.

## 21. Edge Cases
- Customer initiates checkout, but item is purchased at POS register 1 second prior: server returns `INSUFFICIENT_STOCK`; UI re-queries availability and updates cart badge.
- Customer clicks "Pagar" repeatedly in rapid succession: second click is blocked by button disabled state and idempotency guard.
- 3DS challenge window closed by user: clean decline message displayed with retry option.

## 22. Observability
- Emits structured frontend telemetry for checkout step events: `checkout_started`, `payment_submitted`, `checkout_declined`, `checkout_succeeded`, `checkout_stock_conflict`.

## 23. Acceptance Criteria
- [ ] Cart line items resolve to valid `sellable_unit_id`s.
- [ ] Advisory availability check warns user before payment submission if stock is insufficient.
- [ ] Double-click on checkout button is prevented by client disabled state.
- [ ] Duplicate submissions reuse `client_request_id` and are handled idempotently.
- [ ] Stripe card decline and 3DS failure produce distinct, human-readable Spanish error notices.
- [ ] `inventory_exception` status renders dedicated reassurance status banner.
- [ ] Unit and component tests under `tests/frontend/checkout-flow.test.tsx` pass with 100% assertions green.

## 24. Test Strategy
- Vitest + React Testing Library unit tests for `useCheckout` and `CheckoutPage.tsx`.
- Mock API responses simulating HTTP 200 (success), HTTP 402 (card declined), HTTP 409 (`INSUFFICIENT_STOCK`), and HTTP 500 (`DR-ERR-001`).

## 25. Staging Validation
- Perform test checkout on Railway staging environment using Stripe test card `4242...`.
- Verify order record created in `orders` and `order_payments` tables via Supabase dashboard.

## 26. Evidence Requirements
- Test suite execution output (`npm run test:unit tests/frontend/checkout-flow.test.tsx`).
- Video or screenshot evidence of card decline and inventory exception handling.

## 27. Definition of Done
- All acceptance criteria satisfied.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for integration with Critical Path E2E Suite (CCP-33).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Julian (proceed to CCP-24 for Order Confirmation & Tracking UI) and QA Lead (CCP-33 for E2E automation).
