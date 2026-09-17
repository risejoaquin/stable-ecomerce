# QA / RELEASE E — BLOCK C: Production & Infrastructure Evidence

DATE: 2026-09-17T15:43:00-07:00
AGENT: Codex / Antigravity
ENVIRONMENT: Local Windows PowerShell, Railway Production (`heroic-solace`), Supabase (`dporfgsbwsyqzmlnqrug`), GitHub Actions (`risejoaquin/stable-ecomerce`), Stripe CLI (`SolidBit`)
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640

---

## 1. Repository & Commit Verification

CHECK: Git repository state and commit verification
AGENT: Codex
DATE/TIME: 2026-09-17T15:33:33-07:00 / 2026-09-17T15:36:08-07:00
ENVIRONMENT: Local Windows PowerShell (`C:\Users\Lucilfer\Documents\Stable-Ecommerce`)
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: `git status --short; git rev-parse HEAD; git rev-parse origin/main; git log -1 --stat`
EXPECTED: Clean working tree matching origin/main at latest commit.
ACTUAL: HEAD is `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640` ("Restrict legacy uploads to administrators"), matching `origin/main`. Working tree is clean.
RESULT: PASS
EVIDENCE FILE: AGENT_CONTEXT/evidence/block-c/2026-09-17-block-c-production-infrastructure.md
NOTES: Commit `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640` successfully landed SEC-P1-001 legacy upload authorization hardening.

---

## 2. GitHub CI Verification

CHECK: GitHub CI Quality Gate & Production Smoke status
AGENT: Codex
DATE/TIME: 2026-09-17T15:33:50-07:00 to 2026-09-17T15:40:53-07:00
ENVIRONMENT: GitHub Actions (`risejoaquin/stable-ecomerce`)
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: `gh run list --limit 15; gh workflow run production-smoke.yml -f commit=c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640; gh run view 35283166478`
EXPECTED: Quality Gate PASS, Production Smoke runs verified and passing.
ACTUAL:
- Selfcare Quality Gate: run `35282644608` SUCCESS (1m30s) for commit `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`.
- Diagnosis on skipped Production Smoke:
  Railway bot creates GitHub deployments with `environment: "heroic-solace / production"`.
  The workflow `.github/workflows/production-smoke.yml` checks `github.event.deployment.environment == 'production'`.
  Because the strings do not match, every automatic `deployment_status` trigger was skipped.
- Manual verification via `workflow_dispatch`:
  Triggered run `35283166478` with `-f commit=c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`.
  Job `production-smoke` (ID `105409502638`) ran in 15s and PASSED 100%.
RESULT: PASS (with environment name mismatch finding documented)
EVIDENCE FILE: GitHub Actions run `35283166478`
NOTES: To make automatic post-deploy smoke run, `.github/workflows/production-smoke.yml` should match `github.event.deployment.environment == 'production' || github.event.deployment.environment == 'heroic-solace / production'`.

---

## 3. Railway Deployment & Logs Verification

CHECK: Railway deploy status and service logs
AGENT: Codex
DATE/TIME: 2026-09-17T15:36:23-07:00 to 2026-09-17T15:40:00-07:00
ENVIRONMENT: Railway (`heroic-solace` project, `production` environment)
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: `railway status; railway deployment list; railway logs --deployment --lines 50`
EXPECTED: Railway deployment Online and healthy.
ACTUAL:
- Deployment `4d7e9a93-8f14-492d-a33f-2f0f9dc0f043` built and deployed successfully.
- Service `stable-ecomerce` is Online.
- Container log: `[INFO] Server running on port 3000 time=1789684601858 pid=25 hostname="74e2f1ebd1c9"`.
RESULT: PASS
EVIDENCE FILE: AGENT_CONTEXT/evidence/block-c/2026-09-17-block-c-production-infrastructure.md
NOTES: Deployment ID `4d7e9a93-8f14-492d-a33f-2f0f9dc0f043` replaces previous deployment `bfe97cf6-505c-4aee-a0d7-751fa32b230f`.

---

## 4. Supabase Link, Schema & Migrations Verification

CHECK: Supabase connection, schema inventory and security baseline
AGENT: Codex
DATE/TIME: 2026-09-17T15:42:13-07:00
ENVIRONMENT: Supabase Postgres (`dporfgsbwsyqzmlnqrug`) via Railway `SUPABASE_DB_URL`
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: `railway run -- powershell -NoProfile -Command '$env:DATABASE_URL = $env:SUPABASE_DB_URL; .\scripts\qa\database\validate-database-security.ps1'`
EXPECTED: Inventory of tables, functions, RLS, and policies captured.
ACTUAL:
- Total public tables: 280 tables. All have `rowsecurity: true`.
- Total policies: 0 policies.
- Critical functions:
  - `consume_coupon_after_payment`: `prosecdef: true`, `proacl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`, `config: ""` (empty `search_path`).
  - `decrement_stock`: `prosecdef: true`, `proacl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`, `config: ""` (empty `search_path`).
  - `finalize_paid_order`: `prosecdef: true`, `proacl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`, `config: ""` (empty `search_path`).
  - `restock_refunded_item`: NOT PRESENT in the database.
- Report generated: `artifacts/qa/database-security-report.json`.
RESULT: PASS (evidence captured; security findings SEC-018/SEC-019 confirmed)
EVIDENCE FILE: `artifacts/qa/database-security-report.json`
NOTES: Empty search_path and public EXECUTE on SECURITY DEFINER functions confirm open risk SEC-019. Zero RLS policies with RLS enabled confirms reliance on service_role key.

---

## 5. Schema Reproducibility Investigation

CHECK: Schema reproducibility and migration management
AGENT: Codex
DATE/TIME: 2026-09-17T15:39:15-07:00 to 2026-09-17T15:42:30-07:00
ENVIRONMENT: Local repo & Supabase remote
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: Codebase review of `scripts/db/`, `database_schema.sql`, and Supabase migration setup.
EXPECTED: Understanding of how schema was provisioned and how it can be reproduced idempotently.
ACTUAL:
- No standard Supabase CLI migration directory (`supabase/migrations`) exists in the repository.
- No `supabase/config.toml` exists in the repository.
- `scripts/db/` contains 47 individual `.sql` files up to `043_email_production_c_admin_center_templates.sql`.
- `database_schema.sql` at repository root is identical to `001_selfcare_sinners_production_schema.sql`.
- The live database contains 280 tables, incorporating elements from POST-LAUNCH scripts that were manually executed in the SQL editor or prior agents.
- There is no automated schema migration tracking table in Supabase (`schema_migrations` is empty or unmanaged).
RESULT: REPORTED / GAP IDENTIFIED
EVIDENCE FILE: `scripts/db/README.md`, `scripts/db/`
NOTES: Non-destructive investigation only. Do NOT run `supabase db reset --linked`, `supabase db push`, or `supabase migration repair`. Schema reproducibility requires an architectural consolidation strategy from ChatGPT Web.

---

## 6. Dependency & Security Review (npm audit)

CHECK: Controlled npm audit review
AGENT: Codex
DATE/TIME: 2026-09-17T15:41:02-07:00 / 2026-09-17T15:41:07-07:00
ENVIRONMENT: Node v24.14.0, npm 11.9.0
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: `npm audit; npm audit --omit=dev`
EXPECTED: Controlled review of known vulnerabilities without automated fixes.
ACTUAL:
- Full audit: 3 vulnerabilities (2 moderate, 1 high).
  - Moderate: `@vitest/mocker` / `vitest` (dev dependency, Arbitrary File Read / Path Traversal).
  - High: `multer <= 2.2.0` (production dependency, DoS via crafted multipart field names / fd leak / oversized array index).
- Production-only (`--omit=dev`): 1 high vulnerability (`multer`).
- Remediation note: Legacy `/api/upload` endpoint using multer was locked down with `requireAuth(), requireAdmin()` in commit `c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`, mitigating anonymous attack vectors.
RESULT: PASS (controlled audit completed, no unapproved `npm audit fix --force` run)
EVIDENCE FILE: AGENT_CONTEXT/evidence/block-c/2026-09-17-block-c-production-infrastructure.md
NOTES: Baseline vulnerability count preserved as documented in AGENTS.md.

---

## 7. Stripe CLI Operational & Test Mode Verification

CHECK: Stripe CLI configuration and test-mode webhook/event validation
AGENT: Codex
DATE/TIME: 2026-09-17T15:41:12-07:00 to 2026-09-17T15:41:26-07:00
ENVIRONMENT: Stripe CLI v1.50.11
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: `stripe --version; stripe config --list; stripe events list --limit 5; stripe switch context acct_1TLawpEKfBRabUZ0`
EXPECTED: Validate test-mode webhook listener or event triggers safely.
ACTUAL:
- Stripe CLI is logged in as account `acct_1TLawpEKfBRabUZ0` (device: `DESKTOP-JQHNECI`, display name: `SolidBit`).
- Crucial safeguard finding: The CLI project `default` is configured in **LIVE MODE** (`Running in SolidBit · live`).
- Attempting to switch to test sandbox: `Account acct_1TLawpEKfBRabUZ0 does not have sandbox access; use --live to switch to live mode`.
- In strict adherence to the non-negotiable instruction:
  - "Prohibido: realizar cobros reales"
  - "Use test mode and controlled events"
  No live triggers or charges were executed.
RESULT: BLOCKED FOR LIVE SAFETY / AWAITING SANDBOX KEY
EVIDENCE FILE: AGENT_CONTEXT/evidence/block-c/2026-09-17-block-c-production-infrastructure.md
NOTES: Stripe test mode validation cannot proceed until a test-mode API key (`sk_test_...`) or sandbox access is authorized.

---

## 8. Non-Destructive Production Smoke Validation

CHECK: Live production smoke validation
AGENT: Codex
DATE/TIME: 2026-09-17T15:40:00-07:00
ENVIRONMENT: Production (`https://selfcaresinners.com`)
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: `.\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640"`
EXPECTED: All public routes return 200, commit matches, unauthorized admin returns 401, security headers present.
ACTUAL:
- `PASS route / -> 200`
- `PASS route /faq -> 200`
- `PASS route /privacy -> 200`
- `PASS route /returns -> 200`
- `PASS route /terms -> 200`
- `PASS route /track -> 200`
- `PASS health status -> ok`
- `PASS deployed commit -> c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640`
- `PASS admin diagnostics unauthorized boundary -> 401`
- `PASS Content-Security-Policy present`
- `PASS X-Content-Type-Options present`
- `PASS production non-destructive smoke`
RESULT: PASS
EVIDENCE FILE: AGENT_CONTEXT/evidence/block-c/2026-09-17-block-c-production-infrastructure.md
NOTES: Verified on both local runner and GitHub Actions runner `35283166478`.
