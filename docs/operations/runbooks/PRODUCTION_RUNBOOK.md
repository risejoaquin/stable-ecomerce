# Production Runbook — Selfcare Sinners

## Daily checks

- Open `/api/readiness`.
- Review admin diagnostics.
- Check unresolved Stripe events.
- Check pending orders older than 24 hours.
- Check negative stock and inventory exceptions.

## Weekly checks

- Run production smoke script.
- Validate sitemap and robots.
- Review Supabase backups.
- Review Railway deploy history.
- Review Stripe webhook delivery logs.

## Common incidents

### Paid order not finalized

1. Check `stripe_events` for error_message.
2. Check Railway logs for webhook error.
3. Confirm `finalize_paid_order` exists and schema cache is reloaded.
4. Manually reconcile only after verifying Stripe payment.

### Inventory negative

1. Pause product if needed.
2. Check order_items and inventory_movements.
3. Correct stock with audit note.
4. Review checkout/webhook logs.

### CSP or service worker issue

1. Validate console.
2. Unregister service worker.
3. Confirm `sw.js` and CSP headers.
4. Redeploy hotfix.
