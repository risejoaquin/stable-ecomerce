# MOBILE/UX D — Admin Mobile/Tablet Adaptability

Status: IMPLEMENTED — pending user validation.

## Objective

Make the complete Selfcare Sinners administration experience operable on laptop, tablet landscape, tablet portrait and small mobile fallback without changing backend contracts, CRUD hooks, Stripe, email queue, service worker or route splitting.

## Scope completed

- Command Center responsive hardening.
- Admin navigation changed to a compact sticky horizontal command rail on tablet and icon-first rail on small mobile.
- Topbar actions stack safely on tablet/mobile.
- Products page responsive shell, Spanish UI state, touch-safe product table, responsive product form dialog.
- Orders page responsive shell, horizontally scrollable status filters and tables, Spanish operator-facing labels and responsive detail modal.
- Customers table contained in touch-scroll viewport.
- Categories form/table responsive hardening.
- Coupons form/table responsive hardening and Spanish operator-facing labels.
- Commercial/Growth metrics and readiness table adapted for tablet; legacy funnel labels localized.
- Email Center tables receive controlled horizontal scroll on tablet.
- Settings actions/tabs remain reachable without clipping on tablet/mobile.

## Contract protections

The following were deliberately not changed:

- API endpoint paths and React Query hooks.
- Coupon contract values such as `percentage` and `fixed_amount`.
- Product status values such as `active`.
- Order status values consumed by the backend.
- Stripe/payment behavior.
- Email queue/webhook behavior.
- Service worker and Vite chunk architecture.

## Responsive targets

- Desktop >= 1180px: existing left command navigation.
- Tablet 821–1179px: sticky horizontal admin command rail.
- Tablet/mobile <= 820px: stacked topbar/actions, scroll-safe tables and bottom-sheet style product modal.
- Small mobile <= 560px: icon-first admin nav fallback and compact cards.

## Next phase

MOBILE/UX E — Checkout/Cart/Order Flow Mobile QA.
