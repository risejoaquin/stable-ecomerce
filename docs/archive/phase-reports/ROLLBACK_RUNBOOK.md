# Rollback Runbook — Selfcare Sinners

## Railway rollback

1. Railway → Service → Deployments.
2. Select the last known-good deployment.
3. Redeploy/rollback.
4. Validate `/api/health`, `/api/readiness`, `/`, `/api/products`.
5. Run `scripts/qa/smoke-production.ps1`.

## Database rollback

Prefer forward fixes. Only rollback DB when data integrity is at risk.

1. Stop new risky admin operations.
2. Export current DB state.
3. Identify migration to revert.
4. Apply explicit rollback SQL in staging first.
5. Validate integrity checks.
6. Apply to production only with owner approval.

## Stripe rollback note

Never delete live Stripe events. Fix idempotently by processing or marking events with full audit notes.
