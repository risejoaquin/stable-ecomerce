# CURRENT TASK

TASK ID: QA-RELEASE-E-HOTFIX-PRODUCTION-SMOKE-TRIGGER-20260917
BLOCK: Block C — Production & Infrastructure
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION

## Objective

Execute QA / RELEASE E HOTFIX — Production Smoke Trigger by removing only the `if:` condition from the `production-smoke` job in `.github/workflows/production-smoke.yml`, then validate, commit, push, verify GitHub/Railway/production, save evidence, and keep QA / RELEASE E open.

## Files in scope

- AGENT_CONTEXT/00_READ_FIRST.md
- AGENT_CONTEXT/01_CURRENT_STATE.md
- AGENT_CONTEXT/02_MASTER_ROADMAP.md
- AGENT_CONTEXT/03_ACTIVE_PHASE.md
- AGENT_CONTEXT/05_ACCEPTANCE_CRITERIA.md
- AGENT_CONTEXT/06_CURRENT_TASK.md
- AGENT_CONTEXT/07_HANDOFF.md
- AGENT_CONTEXT/09_EVIDENCE_FORMAT.md
- AGENT_CONTEXT/10_DO_NOT_TOUCH.md
- AGENT_CONTEXT/12_COMMANDS.md
- AGENT_CONTEXT/evidence/block-c/2026-09-17-block-c-production-infrastructure.md
- AGENT_CONTEXT/evidence/block-c/2026-09-17-production-smoke-trigger-hotfix.md
- AGENT_CONTEXT/evidence/github/2026-09-17-ci-status.md
- AGENT_CONTEXT/evidence/railway/2026-09-17-deploy-status.md
- AGENT_CONTEXT/evidence/supabase/2026-09-17-schema-inventory.md
- AGENT_CONTEXT/evidence/stripe/2026-09-17-stripe-cli-status.md
- AGENT_CONTEXT/evidence/production/2026-09-17-production-smoke.md
- artifacts/qa/database-security-report.json

## Completed

1. Production Smoke Trigger Hotfix:
   - Modified only `.github/workflows/production-smoke.yml`.
   - Removed only the job-level `if:` condition from `production-smoke`.
   - Preserved `workflow_dispatch`, `deployment_status` states `[success]`, `Resolve deployment commit`, `Checkout deployed commit`, `validate-production.ps1`, `BaseUrl`, and `ExpectedCommit` logic.
2. Validation Before Commit:
   - YAML syntax validated with `npx --yes yaml-lint .github/workflows/production-smoke.yml`: PASS.
   - `git diff --check`: PASS.
3. Commit & Push:
   - Commit: `8e51b3b9b13949ef2e9e10aa18ad21f58541ca51`.
   - Message: `ci: run production smoke on deployment success`.
   - Pushed to `origin/main`.
   - HEAD and `origin/main` now match `8e51b3b9b13949ef2e9e10aa18ad21f58541ca51`.
4. GitHub CI Verification:
   - Selfcare Quality Gate run `35283671819`: SUCCESS.
   - Selfcare Production Smoke no longer remained skipped.
   - First automatic deployment smoke run `35283677281` executed and failed because production still returned previous commit `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`.
   - Second automatic deployment smoke run `35283744525` executed and PASSED against deployed commit `8e51b3b9b13949ef2e9e10aa18ad21f58541ca51`.
5. Railway & Production Verification:
   - Railway service `stable-ecomerce` is Online.
   - Local production validation passed against `https://selfcaresinners.com` with expected commit `8e51b3b9b13949ef2e9e10aa18ad21f58541ca51`.
6. Evidence:
   - Hotfix evidence saved at `AGENT_CONTEXT/evidence/block-c/2026-09-17-production-smoke-trigger-hotfix.md`.

## Prior Block C Evidence Still Relevant

1. Repository & Commit Verification before hotfix:
   - Previous HEAD matched `origin/main` at `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640` ("Restrict legacy uploads to administrators").
2. GitHub CI Verification:
   - Selfcare Quality Gate: run `35282644608` SUCCESS for commit `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`.
   - Manual `workflow_dispatch` on `production-smoke.yml` (run `35283166478`) with commit `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`; executed and PASSED 100% in 15 seconds.
3. Railway Deploy & Logs:
   - Deployment `4d7e9a93-8f14-492d-a33f-2f0f9dc0f043` built and deployed successfully.
   - Status: Online. Runtime log confirms container active and listening on port 3000.
4. Supabase Link, Schema & Migrations:
   - Non-destructive database security inventory executed via `scripts/qa/database/validate-database-security.ps1`.
   - Captured 280 public tables, all with `rowsecurity: true`.
   - Confirmed 0 RLS policies in `public`.
   - Critical functions audited: `consume_coupon_after_payment`, `decrement_stock`, `finalize_paid_order` exist with `SECURITY DEFINER` and empty `search_path`, while `restock_refunded_item` is missing.
   - Report generated: `artifacts/qa/database-security-report.json`.
5. Schema Reproducibility Investigation:
   - Discovered repository has no `supabase/migrations/` directory and no `supabase/config.toml`.
   - 47 SQL files exist in `scripts/db/` alongside root `database_schema.sql`.
   - Remote Supabase database has no migration history table tracking these scripts.
6. Controlled npm audit:
   - Executed without `--force`: 3 total vulnerabilities (2 moderate dev `@vitest/mocker`/`vitest`, 1 high prod `multer`).
   - Confirmed multer endpoint `/api/upload` is now restricted to admins as of commit `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`.
7. Stripe CLI Test Mode Verification:
   - Verified Stripe CLI v1.50.11 configured for account `acct_1TLawpEKfBRabUZ0` (SolidBit).
   - CLI profile is set to LIVE MODE.
   - Attempt to switch context to test sandbox indicated account lacks sandbox access.
   - Live events/triggers strictly skipped to prevent unauthorized real transactions.
8. Non-Destructive Production Smoke:
   - Executed `.\scripts\qa\validate-production.ps1` against `https://selfcaresinners.com`: all routes (/, /faq, /privacy, /returns, /terms, /track), health check, deployed commit verification, 401 admin boundary, and security headers (CSP, X-Content-Type-Options) PASSED 100%.
9. Evidences Compiled:
   - Stored in `AGENT_CONTEXT/evidence/block-c/`, `github/`, `railway/`, `supabase/`, `stripe/`, and `production/`.

## Pending / Review Items for ChatGPT Web

1. Stripe Test Mode Credentials:
   - Provide test-mode API key or configure Stripe sandbox credentials so Block A/C payment flows can be validated in test mode without risking real card charges.
2. Supabase Schema Consolidation & Reproducibility Strategy:
   - Decide on migration consolidation strategy (e.g. init `supabase/migrations` from canonical schema or baseline 280-table state).
   - Address SEC-018 / SEC-019 (RLS policies for public tables, search_path and execution grants for SECURITY DEFINER functions, add missing `restock_refunded_item`).
3. Block A & Block B Completion:
   - Functional test packets (storefront, auth, admin, checkout) and quality gates (accessibility, full responsive suite) remain to be completed before overall QA E can close.

## Last command

```text
gh run view 35283744525 --log
```

## Last result

```text
PASS Selfcare Production Smoke run 35283744525 against deployed commit 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51.
```

## Blockers

- Overall QA / RELEASE E is NOT closed (Block A and remaining Block B items are pending).
- Stripe test-mode event testing blocked until sandbox access or test API key is provided.

## Next exact action

Submit Block C evidence to ChatGPT Web for architectural validation and direction on Block A functional test execution.
