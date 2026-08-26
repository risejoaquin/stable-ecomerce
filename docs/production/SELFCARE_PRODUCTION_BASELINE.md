# Selfcare Sinners — Production Baseline

## Deployment target

- Domain: `https://selfcaresinners.com`
- Backend/frontend deploy: Railway
- Payments: Stripe Checkout + signed webhooks
- Email: Resend
- Database: Supabase Postgres
- Project mode: single ecommerce storefront, not a multi-store SaaS

## Environment contract

Railway production must define:

- `ADMIN_EMAIL`
- `EMAIL_FROM`
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `VITE_API_URL`
- `VITE_APP_URL`

Recommended additional variable:

- `PRIMARY_STORE_SLUG=selfcare-sinners`
- `ALLOWED_ORIGINS=https://selfcaresinners.com,https://www.selfcaresinners.com`

## Phase A scope completed in this package

This package starts the production hardening path and focuses on high-risk blockers:

1. Production env validation: production now fails fast if critical secrets are missing.
2. Admin authorization: `/api/admin/*` is protected by admin role middleware.
3. Admin hardcode removal: hardcoded personal admin email was removed from role resolution.
4. Single-store operating mode: API defaults to the primary Selfcare Sinners store.
5. Guest order creation: `/api/orders` now supports optional auth for guest checkout.
6. Coupon safety: coupon usage is no longer incremented before payment confirmation.
7. Stripe webhook safety: inventory decrement errors are detected and mark order as `inventory_exception`.
8. Production CORS: production origins are restricted to configured domains.
9. Production CSP: Helmet CSP is enabled in production with Stripe-compatible directives.
10. Database contract: schema includes roles, wishlist, shipping/billing profile fields, audit logs, inventory movements, payment/status fields, and safe stock decrement.

## Remaining production blockers

- Run schema on Supabase production or a clean database before validating checkout.
- Confirm `ADMIN_EMAIL` exists in `users` and has `role='admin'`.
- Validate Stripe webhook endpoint points to `/api/webhooks/stripe` and uses the matching `STRIPE_WEBHOOK_SECRET`.
- Validate Resend SPF/DKIM/DMARC and `EMAIL_FROM` domain.
- Add automated integration tests against a staging Supabase database.
- Add full Playwright ecommerce flow: catalog → cart → order → Stripe test checkout → success.

## Railway log checks after deploy

Expected healthy indicators:

- No `Missing required production environment variables` crash.
- `/api/health` returns `status: ok` and `database: connected`.
- Admin endpoints return `403 Admin access required` for normal users.
- Admin endpoints return `200` for the configured admin account.
- Stripe webhook logs `Received Stripe event: checkout.session.completed`.
- Duplicate Stripe events log `already processed`.
- Stock failures log `Stock decrement failed after payment` and set order status `inventory_exception`.

