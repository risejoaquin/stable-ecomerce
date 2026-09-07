# Phase C — Ecommerce Operations & Admin Hardening

## Objective

Bring the admin/operations layer closer to a production ecommerce workflow after payment integrity was validated.

## Scope delivered

- Admin operations dashboard endpoint: `/api/admin/operations/summary`.
- Stripe/webhook visibility: `/api/admin/stripe-events`.
- Audit log visibility: `/api/admin/audit-logs`.
- Inventory movement visibility: `/api/admin/inventory/movements`.
- Order timeline table and timeline writes for status/tracking/email actions.
- Strict order status transition validation.
- Tracking updates with audit and timeline entries.
- Paid order confirmation resend endpoint.
- Coupon update endpoint and coupon audit logs.
- Customer detail endpoint with order history.
- Product variant normalization during create/update.
- Dashboard UI now surfaces operational alerts, low stock, Stripe webhook issues and recent audit activity.

## Required database migration

Run in Supabase SQL Editor before validating the phase:

```txt
scripts/db/004_ecommerce_operations_admin_hardening.sql
```

## Validation checklist

1. Railway deploy passes.
2. Admin login works.
3. `GET /api/admin/operations/summary` returns 200.
4. Dashboard shows operational cards.
5. Orders list loads.
6. Order detail loads timeline when available.
7. Status transitions reject invalid jumps.
8. Tracking save creates audit and timeline records.
9. Coupon update works and creates audit log.
10. Stripe events and inventory movement endpoints return data.

## Expected operational result

The admin can now monitor payment/webhook health, inventory movement, low stock, recent audit activity, customer/order history and post-payment fulfillment states from a single ecommerce operations surface.
