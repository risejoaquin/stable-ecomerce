# Execution Pack: CCP-24 — Order Confirmation & Status Tracking — Customer Presentation & Lookup Hardening

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Storefront Experience
- **Assignee Lead**: Julian (Frontend Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)

## 2. Objective
Harden the existing storefront order presentation and tracking pages (`CheckoutSuccessPage.tsx` and `TrackOrderPage.tsx`), verifying that confirmed order details and live fulfillment statuses (`paid`, `processing`, `shipped`, `inventory_exception`) render accurately, preventing customer PII and sensitive payment tokens from leaking on public tracking lookups, and providing clean, reassuring customer feedback on exceptions.

## 3. Why
Fulfills **DR-ERR-001** and customer security/privacy requirements. Post-purchase transparency builds consumer trust. If an order encounters an inventory contention edge-case (`inventory_exception`), the customer must receive clear, comforting status communication rather than a confusing blank page or raw technical error code. Furthermore, public order tracking endpoints must strictly redact customer addresses, phone numbers, and payment tokens to prevent data scraping.

## 4. Owner Profile
Senior React / Frontend Engineer with expertise in secure data rendering, sensitive information masking (PII redaction), accessibility standards, and customer-facing error communication.

## 5. Preconditions
- `CheckoutSuccessPage.tsx` and `TrackOrderPage.tsx` operational in `src/pages/store/`.
- CCP-15 (Storefront Checkout Flow) completed.
- CCP-23 (Transactional Email Automation) operational.

## 6. Dependencies
- **Preceding Tickets**: CCP-15, CCP-23.
- **Downstream Blocking**: Blocks CCP-35 (Feature Freeze Enforcement) and CCP-37 (Client UAT).

## 7. Authoritative Contracts
- **DR-ERR-001 (Canonical Error Envelope & Customer Presentation)**
- **DR-REC-001 (Deterministic Receipt / Order Read Model)**
- `docs/engineering/client-01/04_ORDER_CONTRACT.md`

## 8. Scope IN
- Hardening `src/pages/store/CheckoutSuccessPage.tsx`:
  - Renders confirmed canonical order number.
  - Displays itemized product names, SellableUnit options, quantities, and totals.
  - Displays masked delivery address.
  - Provides CTA to track order or return to store.
- Hardening `src/pages/store/TrackOrderPage.tsx`:
  - Public order lookup form accepting Order Number + Customer Email (two-factor query validation to prevent enumeration).
  - Sanitized response rendering: fulfillment status, carrier name, tracking link.
  - Redaction: masks customer email (`j***@example.com`), hides complete shipping street address, and strips all internal payment tokens/intent IDs.
  - Dedicated reassuring status banner for `inventory_exception` ("Tu pedido está en revisión prioritaria por nuestro equipo de inventario. Te notificaremos a la brevedad.").
  - Graceful handling of invalid or non-existent order numbers with user-friendly alerts.
- Unit and component tests under `tests/frontend/order-tracking-hardening.test.tsx`.

## 9. Scope OUT
- Recreating `CheckoutSuccessPage.tsx` or `TrackOrderPage.tsx` from scratch.
- Backend order persistence changes (handled in CCP-13).
- POS cashier receipt thermal printing (handled in CCP-27).

## 10. Required Behavior
1. Navigating to `/store/order-success?order_id=UUID` queries the public order confirmation endpoint and renders full itemized details.
2. Navigating to `/store/track-order` renders lookup form requiring both Order ID and Email.
3. The response payload explicitly omits raw Stripe tokens, credit card last4, full customer addresses, and internal user IDs.
4. If order status is `inventory_exception`, the page displays an amber status badge with clear explanatory guidance and a direct WhatsApp/support contact button.
5. If order does not exist, display: "No pudimos encontrar un pedido con esos datos. Por favor verifica el número y correo electrónico." without uncaught exceptions.

## 11. Inputs
- URL query parameter `order_id` on success page.
- Form inputs `orderNumber` and `email` on tracking page.

## 12. Outputs
- Sanitized rendered order status view.
- PII-redacted display components.

## 13. Allowed Implementation Freedom
- Visual layout of tracking timeline steps (e.g. icon stepper with Paid -> Processing -> Shipped -> Delivered).
- Reassurance copy tone and support contact button styling.

## 14. Forbidden Changes
- DO NOT expose full customer PII, phone numbers, or complete billing addresses in public lookup responses.
- DO NOT expose internal Stripe PaymentIntent IDs or raw database foreign keys.
- DO NOT rewrite existing page scaffolding from scratch.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/store/CheckoutSuccessPage.tsx`
  - `src/pages/store/TrackOrderPage.tsx`
  - `src/components/store/OrderStatusBadge.tsx`
  - `tests/frontend/order-tracking-hardening.test.tsx`
- **Strictly Prohibited**:
  - Backend payment ledger migrations (CCP-13 / Rogelio domain).

## 16. Data Impact
- Read-only queries against order tracking endpoints. Zero database writes.

## 17. API Impact
- Consumes `GET /api/orders/public/:id` or `POST /api/orders/track`.

## 18. Security
- Mitigates OWASP Top 10 A01:2021 (Broken Access Control) and PII data harvesting.
- Requires dual parameter matching (Order ID + Email) for order detail retrieval.

## 19. Concurrency & Idempotency
- Pure read queries; idempotent and safe under high concurrent lookups.

## 20. Migration Considerations
- Supports both historical orders and newly created omnichannel orders.

## 21. Edge Cases
- Order number entered with leading/trailing spaces or lowercase: client trims and standardizes casing before lookup.
- Order in `cancelled` or `refunded` state: displays clean cancellation notice without broken UI.

## 22. Observability
- Failed order lookups log client event `order_lookup_failed` to assist in tracking broken customer links.

## 23. Acceptance Criteria
- [ ] `CheckoutSuccessPage.tsx` displays confirmed order number, itemized products, and masked shipping address.
- [ ] `TrackOrderPage.tsx` returns order fulfillment status without leaking customer PII or billing tokens.
- [ ] Status `inventory_exception` displays clear, comforting status banner with support action.
- [ ] Non-existent order numbers return clean user alert without uncaught exceptions or page crashes.
- [ ] Component tests under `tests/frontend/order-tracking-hardening.test.tsx` pass 100%.

## 24. Test Strategy
- Vitest + React Testing Library tests asserting PII redaction, invalid order error boundaries, and `inventory_exception` banner presentation.

## 25. Staging Validation
- Complete a test purchase on Railway staging, navigate to tracking page, search with order number and email, verify status display and absence of exposed PII in DOM or network payload.

## 26. Evidence Requirements
- Component test execution transcript with 100% assertions green.
- Screenshot of `inventory_exception` status UI presentation.

## 27. Definition of Done
- Order presentation and tracking hardened.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for inclusion in Feature Freeze candidate (CCP-35).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: QA Lead (CCP-35 Feature Freeze & CCP-37 Client UAT).
