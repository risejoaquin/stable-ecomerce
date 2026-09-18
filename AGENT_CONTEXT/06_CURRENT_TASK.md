# CURRENT TASK

TASK ID: PL20-01-EVIDENCE-DRIVEN-SCALE-ASSESSMENT
PHASE: POST-LAUNCH 20
STATUS: IN_PROGRESS

## Objective

Transition POST-LAUNCH 20 endpoints and data models from static seeded assessment values (e.g. 100/95/95, 95/92/94, 85/90/92, `finalScaleReady: true`) to an evidence-driven final commercial and technical scale assessment layer.

## Files in scope

- `server.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `scripts/qa/smoke-final-scale-report.ps1`
- `AGENT_CONTEXT/01_CURRENT_STATE.md`
- `AGENT_CONTEXT/02_MASTER_ROADMAP.md`
- `AGENT_CONTEXT/03_ACTIVE_PHASE.md`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/09_KNOWN_ISSUES.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-18-pl20-01-evidence-driven-final-scale-assessment.md`

## Key Execution Rules

1. Do NOT rerun legacy PL20 SQL (`026_post_launch_20_final_commercial_scale_report_strategic_roadmap.sql`).
2. Do NOT recreate PL20 tables or reset Supabase.
3. Do NOT touch Stripe live or send real emails.
4. Prefer NO schema migration (use existing JSONB evidence/metadata columns).
5. All scores must be backed by real evidence or set to `null` / status `not_measured`.
6. Enforce strict admin authorization and input validation across all `/api/admin/final-scale/*` routes.
