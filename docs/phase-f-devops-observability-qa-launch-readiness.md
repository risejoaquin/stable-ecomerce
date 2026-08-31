# SUPERFASE F — DevOps, Observability, QA, Backup & Launch Readiness

## Scope

This phase closes operational readiness for Selfcare Sinners production.

## Added

- `/api/readiness` with real dependency checks.
- Admin diagnostics routes.
- Operational events table.
- Smoke test scripts.
- Supabase integrity scripts.
- Stripe event monitoring SQL.
- Production runbooks and launch checklist.
- Request ID response header and structured request logging.

## Required migration

Run `scripts/db/007_devops_observability_qa_launch_readiness.sql`.

## Closure criteria

- Public smoke checks pass.
- Admin smoke checks pass.
- Readiness returns 200.
- Diagnostics routes return 200.
- No unresolved Stripe event errors.
- No negative stock.
- Backup/rollback documentation present.
