# Incident Response — Selfcare Sinners

## Severity levels

- SEV1: Checkout/payment outage or data corruption.
- SEV2: Admin cannot fulfill orders or public storefront partially unavailable.
- SEV3: SEO/PWA/console issue that does not block checkout.

## First response

1. Identify affected route or operation.
2. Capture Railway logs and request ID.
3. Check `/api/readiness` and admin diagnostics.
4. Check Supabase integrity SQL.
5. Check Stripe webhook dashboard when payment-related.

## Communication

Record incident start time, impact, mitigation, root cause, and follow-up action in `operational_events` or admin notes.
