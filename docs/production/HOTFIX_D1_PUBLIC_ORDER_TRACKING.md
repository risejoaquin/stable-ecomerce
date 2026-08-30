# Hotfix D.1 — Public Order Tracking Resilience

## Problem

`GET /api/orders/track` returned 500 with PostgREST error `Cannot coerce the result to a single JSON object` when a public tracking lookup did not match exactly or a legacy/manual order had `customer_email` as null.

## Fix

- Replaced `.single()` lookup with `.maybeSingle()`.
- Fetches by `order_id` first and validates normalized `customer_email` in application code.
- Returns clean `404 Order not found` for invalid data instead of a server error.
- Adds structured server log `Public order tracking failed` only for unexpected failures.

## Operational note

Orders manually finalized without `customer_email` cannot be tracked publicly until the email is backfilled. New checkout orders should keep `customer_email` automatically.
