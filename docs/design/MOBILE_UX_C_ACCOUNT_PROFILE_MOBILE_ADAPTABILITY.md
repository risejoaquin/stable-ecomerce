# MOBILE/UX C — Account/Profile Mobile Adaptability

Status: IMPLEMENTED — pending local/production validation.

## Scope

- Login / Register / Forgot password modal mobile hardening.
- Verify Email regression protection.
- Reset Password premium/mobile migration.
- Recover Cart premium/mobile migration and Spanish UI.
- Profile responsive hardening without synthetic account data.
- My Orders responsive regression protection.
- Wishlist responsive regression protection.
- Track Order premium/mobile migration and StoreHeader removal.
- Checkout Success premium/mobile migration without changing Stripe/payment contracts.

## Technical decisions

- Preserve existing API endpoints and auth/session behavior.
- Preserve real profile/orders/wishlist data contracts from ACCOUNT/FLOW A.
- Reuse UixPageShell, UixStatePanel and UixStatusBadge rather than create a second account design system.
- Do not touch admin screens (MOBILE/UX D).
- Do not redesign the full checkout/payment E2E flow (MOBILE/UX E).
- Keep auth modal available as the canonical login/register/forgot-password surface.

## Mobile behavior added

- Auth modal becomes bottom-sheet-like on very small screens.
- Auth modal locks body scroll while open and closes with Escape.
- Account forms collapse to one column on mobile.
- Reset Password uses explicit autocomplete=new-password fields.
- Track Order collapses search controls and detail/timeline to one column.
- Track progress remains horizontally usable on narrow screens.
- Checkout Success CTAs become full-width on mobile.
- Profile panel actions and wishlist controls remain reachable/touch friendly.

## Protected behavior

- Login/register/forgot-password endpoints unchanged.
- Verify-email endpoint unchanged.
- Reset-password endpoint unchanged.
- Cart recovery endpoint unchanged.
- Orders tracking endpoint unchanged.
- Stripe/payment behavior unchanged.
- Central auth session, email system, service worker and lazy routes unchanged.

## Validation gate

1. smoke-mobile-ux-c.ps1 PASS.
2. smoke-mobile-ux-b.ps1 PASS.
3. smoke-login-uix-a.ps1 PASS.
4. npm run build PASS.
5. Git commit/push PASS.
6. Railway deploy PASS.
7. smoke-qa-release-e.ps1 production PASS.
8. Manual responsive review PASS.
