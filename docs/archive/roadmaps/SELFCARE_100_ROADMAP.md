# Selfcare Sinners — Roadmap to 100%

## Operating rule

Each phase produces a full ZIP, is uploaded to GitHub, deploys through Railway, and is validated using Railway logs plus endpoint/UI checks.

## Superfase A — Production Safety Core

Goal: remove critical security and production blockers.

- Enforce required production environment variables.
- Remove hardcoded admin identity.
- Implement real role-based admin protection.
- Restrict CORS in production.
- Enable Stripe-compatible production CSP.
- Align database schema with code.
- Add wishlist/profile/admin schema support.
- Make ecommerce single-store by default.

Exit criteria:

- Build passes.
- `/api/health` works in Railway.
- Normal users receive 403 on `/api/admin/*`.
- Admin user can access `/api/admin/*`.

## Superfase B — Payment and Order Integrity

Goal: make payments, inventory, orders and coupons transactionally safe.

- Make Stripe webhook the single source for paid order confirmation.
- Add payment intent persistence.
- Add order timeline.
- Add full and partial refund audit.
- Make stock decrement fully transactional by order.
- Add webhook retry/recovery runbook.
- Add Stripe test matrix.

Exit criteria:

- Duplicate Stripe webhook cannot double-process order.
- Coupon is consumed only after confirmed payment.
- Stock cannot become negative.
- Paid order with inventory failure is visible and recoverable.

## Superfase C — Ecommerce Operations

Goal: make the admin panel operational.

- Products: archive instead of destructive delete.
- Orders: status transitions, tracking, notes, resend emails.
- Customers: order history and total spend.
- Coupons: validation, usage analytics, expiration.
- Reviews: moderation.
- Audit logs: every admin mutation.

Exit criteria:

- Store can be operated without manual Supabase edits.

## Superfase D — Storefront Completion

Goal: complete buyer experience.

- Home conversion sections.
- Catalog search/filter/sort.
- Product detail with related products and reviews.
- Cart and coupon UX.
- Guest checkout and account checkout.
- Success/failure pages.
- Account order history and wishlist.

Exit criteria:

- New customer can complete purchase without admin help.

## Superfase E — SEO, Performance and Accessibility

Goal: make the site indexable, fast and accessible.

- Dynamic metadata.
- Product structured data.
- Sitemap and robots.
- Image optimization.
- Lighthouse 90+ targets.
- Keyboard and screen reader checks.
- Mobile checkout optimization.

Exit criteria:

- Lighthouse: Performance 90+, Accessibility 90+, SEO 95+.

## Superfase F — DevOps, Observability and Release Discipline

Goal: make changes safe to deploy.

- Staging environment.
- CI pipeline: lint, test, build, e2e.
- Sentry frontend/backend.
- Structured logs with request/order/payment IDs.
- Backups and rollback plan.
- Railway runbook.

Exit criteria:

- No production deploy without passing gates.

