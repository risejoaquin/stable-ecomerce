# Phase A Report — Production Safety Core

## Changed modules

- `server.ts`
- `database_schema.sql`
- `scripts/db/001_selfcare_sinners_production_schema.sql`
- `docs/production/SELFCARE_PRODUCTION_BASELINE.md`
- `docs/roadmap/SELFCARE_100_ROADMAP.md`
- `docs/production/PHASE_A_REPORT.md`

## Changes applied

### Production environment

- Added fail-fast production validation for required secrets and service variables.
- Added `PRIMARY_STORE_SLUG` support with default `selfcare-sinners`.
- Added `APP_URL` / `API_URL` resolution for production redirects.
- Removed insecure static JWT fallback in production.

### Security

- Added production CORS allowlist.
- Added production Helmet CSP compatible with Stripe.
- Added `requireAdmin()` middleware.
- Added global `/api/admin/*` admin protection.
- Removed hardcoded personal admin email check from role resolution.
- Admin role now resolves from database role, with `ADMIN_EMAIL` still allowed as an operational bootstrap identity.

### Single ecommerce mode

- Public products now default to the Selfcare Sinners primary store if `store_slug` is not passed.
- Backend helper `getPrimaryStoreId()` centralizes the primary store lookup.
- Public store endpoint uses the configured primary store.

### Checkout and orders

- `/api/orders` now uses optional auth so guest checkout can create orders.
- `customerEmail` is accepted and validated during order creation.
- Coupon usage is no longer incremented at pending order creation.
- Stripe checkout success/cancel URLs now use the configured production app URL.

### Stripe webhook and inventory

- Webhook still verifies Stripe signature using raw body.
- Stock decrement RPC errors are now detected.
- Paid orders with stock reconciliation failure are marked `inventory_exception` for manual recovery.
- Coupon consumption moved to post-payment webhook path through `consume_coupon_after_payment`.

### Database contract

- Added `users.role`.
- Added `shipping_address` and `billing_address`.
- Added `wishlist_items`.
- Added `inventory_movements`.
- Added `audit_logs`.
- Added order financial/status fields.
- Added indexes and checks for production consistency.
- Replaced unsafe stock decrement with a function that fails when stock is insufficient.

## Validation performed locally

- Static file inspection completed.
- ZIP regenerated excluding `node_modules`.
- `npm ci` / full build could not be completed in the sandbox because dependency installation timed out. Run the commands below after pushing to GitHub or in Railway/GitHub Actions.

## Commands to run after unzip / before deploy

```bash
npm ci
npm run lint
npm run build
npm test
```

## Database setup

Because the database has no important data, run:

```sql
-- Supabase SQL Editor
-- paste scripts/db/001_selfcare_sinners_production_schema.sql
```

Then ensure the admin account has the right role:

```sql
UPDATE users
SET role = 'admin', is_verified = true, updated_at = NOW()
WHERE lower(email) = lower('<ADMIN_EMAIL>');
```

## Railway checks after deploy

```bash
curl https://selfcaresinners.com/api/health
```

Expected:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Admin security check:

- No token: `/api/admin/products` must return 401 or 403.
- Normal user token: `/api/admin/products` must return 403.
- Admin token: `/api/admin/products` must return 200.

Stripe check:

- Create one test order.
- Complete Stripe Checkout in test mode.
- Railway logs should show `checkout.session.completed`.
- Order should change to `pagado`.
- Coupon usage should increment only after payment.
- Stock should decrement only after payment.

## Logs to send if it fails

Send Railway logs around:

- application boot;
- `/api/health` request;
- login request;
- `/api/admin/products` request;
- `/api/orders` request;
- `/api/checkout` request;
- `/api/webhooks/stripe` event.

Also send the exact HTTP response body for any failed endpoint.
