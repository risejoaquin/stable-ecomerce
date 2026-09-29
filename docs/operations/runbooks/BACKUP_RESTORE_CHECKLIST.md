# Backup / Restore Checklist — Selfcare Sinners

## Before launch

- Confirm Supabase automatic backups are enabled for the production project.
- Export a manual SQL backup before every schema migration.
- Capture Railway deployment ID before every production deploy.
- Keep Stripe webhook endpoint ID and signing secret in the secure environment vault.

## Manual backup checkpoint

1. Supabase Dashboard → Database → Backups.
2. Create/confirm latest backup.
3. Export schema/migration files from `scripts/db`.
4. Save deployment SHA from Railway.
5. Run smoke checks after backup.

## Restore drill

1. Restore into a staging database first.
2. Run `scripts/qa/check-supabase-integrity.sql`.
3. Validate `/api/readiness` against staging.
4. Validate one read-only admin diagnostics session.
5. Only restore production after explicit owner approval.

## Do not restore blindly when

- There are recent paid Stripe orders not reconciled.
- `stripe_events` has unprocessed `checkout.session.completed` events.
- A refund or fulfillment operation is in progress.
