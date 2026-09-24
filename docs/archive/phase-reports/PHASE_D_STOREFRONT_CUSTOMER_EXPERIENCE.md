# SUPERFASE D — Storefront Completion & Customer Experience

## Scope

Phase D upgrades the customer-facing experience after the payment and admin operations layers were validated.

## Included

- D.0 database trigger for real order status timeline changes.
- Commercial Selfcare Sinners home page.
- Stronger product detail page with variants, stock, SKU, reviews and trust blocks.
- Improved cart and guest checkout UX.
- Public order tracking with timeline display.
- FAQ/help page linked from storefront footer.
- Mobile-first storefront layout improvements.
- Better empty states and Spanish customer copy.
- Selfcare Sinners branding in storefront and admin shell.

## Migration

Run:

```sql
scripts/db/005_storefront_customer_experience_and_timeline.sql
```

## Validation

- `GET /` returns 200.
- `GET /product/:id` returns 200.
- `GET /track` returns 200.
- `GET /faq` returns 200.
- Cart can collect guest email without `prompt()`.
- Checkout still creates Stripe session.
- Public tracking returns order data and timeline.
- Updating order status creates audit log and a real timeline entry.

## Risk notes

- The D.0 trigger may create a `status_changed_trigger` row in addition to API-level timeline rows if both paths are active. This is acceptable for operational traceability and can be normalized later with actor attribution.
