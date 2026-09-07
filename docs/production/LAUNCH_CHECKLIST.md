# Launch Checklist — Selfcare Sinners

## Public routes

- `/` returns 200.
- `/faq` returns 200.
- `/track` returns 200.
- `/robots.txt` returns 200.
- `/sitemap.xml` returns 200.
- `/api/seo/products` returns 200.
- Product slug pages return 200.

## Payment

- Stripe checkout creates live session.
- Webhook returns 200.
- `stripe_events.error_message` is null for latest completed event.
- Paid order finalizes automatically.
- Inventory movement is created.

## Admin

- Admin login works.
- Orders load.
- Order detail loads.
- Status transition works.
- Audit log records action.
- Diagnostics routes return 200.

## Production polish

- No red CSP console errors.
- Service worker loads.
- Manifest loads.
- Mobile layout usable.
- Legal/footer links visible.
