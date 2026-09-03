# MOBILE/UX E — Checkout/Cart/Order Flow Mobile QA

## Objective
Harden the complete mobile commerce journey without changing payment, inventory, email, or order backend contracts.

## Validated journey
Home -> Catalog/Search -> Product Detail -> Cart -> Guest/Auth checkout -> Stripe -> Checkout Success -> My Orders -> Track Order.

Recovery journey:
Recover Cart -> restored cart -> Cart -> Stripe checkout.

## Changes
- Cart drawer restores focus after close and moves focus to the close control on open.
- Guest checkout email has an explicit label, autocomplete and mobile email keyboard hint.
- Cart validation errors expose alert semantics and checkout exposes busy state.
- Checkout hook rejects missing checkout URLs and uses Spanish customer-facing errors.
- My Orders validates resumed checkout URLs and reports resume failures in Spanish.
- Track Order preloads the previously saved guest checkout email when available.
- Recover Cart, Orders, Tracking, and Checkout Success expose MOBILE/UX E markers for regression coverage.
- Small-mobile checkout controls preserve 46–48px minimum interactive heights.

## Contracts intentionally protected
- POST /api/orders
- POST /api/checkout
- POST /api/cart/sync
- GET /api/cart/recover
- GET /api/orders/my
- GET /api/orders/track
- Stripe success URL remains /checkout/success?session_id={CHECKOUT_SESSION_ID}
- Cart is not cleared before Stripe succeeds; CheckoutSuccessPage remains responsible for clearCart().

## Non-goals
No Stripe webhook rewrite, order state rewrite, inventory rewrite, email queue changes, admin redesign, service worker changes, or Vite chunk changes.

## Next phase
MOBILE/UX F — Final Visual Regression Closure.
