# Hotfix B.1 — Webhook Finalization Resilience

## Scope

Fixes Stripe webhook finalization reliability after a live payment reached Railway but returned HTTP 500 while leaving `stripe_events.processed_at` as `NULL`.

## Changes

- Adds `scripts/db/003_webhook_finalization_resilience.sql`.
- Recreates `finalize_paid_order(...)` so it always returns one explicit result row.
- Ensures `stripe_events.error_message` and `stripe_events.payload` exist.
- Records failed webhook processing messages in `stripe_events.error_message`.
- Clears `error_message` when the webhook is successfully processed.
- Prevents email delivery failures from turning a finalized Stripe payment webhook into HTTP 500.

## Required SQL

Run in Supabase SQL Editor before retrying webhook events:

```sql
-- scripts/db/003_webhook_finalization_resilience.sql
```

## Validation

1. Create a new low-price test product or use Stripe test mode.
2. Complete checkout.
3. Confirm Railway logs include `POST /api/webhooks/stripe 200`.
4. Confirm Supabase:

```sql
SELECT id, status, stripe_payment_intent_id, paid_at, notes
FROM orders
ORDER BY created_at DESC
LIMIT 5;

SELECT id, type, processed_at, error_message, created_at
FROM stripe_events
ORDER BY created_at DESC
LIMIT 10;

SELECT product_id, order_id, quantity_delta, reason, notes, created_at
FROM inventory_movements
ORDER BY created_at DESC
LIMIT 10;
```

Expected:

- order status `pagado`;
- `stripe_events.processed_at` is not null;
- `stripe_events.error_message` is null;
- inventory movement exists with `reason = sale`.
