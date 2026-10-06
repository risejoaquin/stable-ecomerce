# Production Release Execution Runbook

**Document ID**: `RB-PROD-001`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Authority**: Authoritative Operational Protocol for Production Deployment
**Execution Date**: **16 Oct 2026** (Current approved release calendar)
**Parent Epic**: `CCP-38` / `CCP-44`

---

## 1. Executive Summary & Mandatory Release Calendar

This runbook specifies the precise step-by-step procedure for executing the **Production Release** and operational handoff of Client 01 v1.0 on **16 Oct 2026**, only after a GO decision and all release gates PASS.

```text
13 Oct 2026: Feature Freeze & Release Candidate Cut (rc/client01-v1.0)
14 Oct 2026: Hardening, Regression Sweeps & Security Verification
15 Oct 2026: Formal UAT & Acceptance Signoff
16 Oct 2026: GO/NO-GO, Manual Authorized Production Deployment, Smoke Verification & Handoff
```

> **CURRENT RELEASE AUTHORITY RULE**:
> **16 Oct 2026 is the target GO/NO-GO and production handoff date.** Production deployment is never automatic; it requires explicit authorization and all required gates PASS.
---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Production deployment requires unanimous written authorization from QA Lead, Engineering Lead, and Product Owner.
   - Database migrations must be applied and verified before cutting over application traffic.
   - Zero-downtime deployment executed on Railway using rolling container replacement.
   - Non-destructive synthetic smoke validation must pass on production immediately post-deploy.

2. **FROZEN CONTRACT**:
   - `DR-INV-001`, `DR-PAY-001`, `DR-IDEM-001`, `DR-AUTH-001`, `DR-ERR-001`, `DR-REC-001` are active and enforced.

3. **DERIVED ENGINEERING DESIGN**:
   - Four-stage deployment sequence (Pre-flight -> Migration -> Application -> Post-deploy verification).
   - Exact Railway CLI and PowerShell execution commands.
   - Abort criteria and rollback triggers.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Terminal output logging destination (`artifacts/release/2026-10-05-production-release.log`).

---

## 3. Pre-Flight Release Authorization Checklist (16 Oct 2026, pre-flight window)

Before any production command is issued, all gate criteria must be checked:

| Check Item | Requirement | Verified By | Status |
| :--- | :--- | :--- | :--- |
| **G-01: CI Quality Gates** | 100% green on `rc/client01-v1.0` (commit `$RELEASE_SHA`) | CI Pipeline | [ ] PASS |
| **G-02: Staging Validation** | All automated staging regressions passed (`STG-VAL-001`) | QA Lead (Agent C) | [ ] PASS |
| **G-03: UAT Sign-Off** | Signed UAT Certificate with 0 Sev-1/Sev-2 blockers (`RB-UAT-001`) | Product Owner (Julian) | [ ] PASS |
| **G-04: DB Backup** | Fresh Supabase PITR recovery point verified | DBA / Tech Lead (Rogelio)| [ ] PASS |
| **G-05: Secret Verification** | All 11 required production environment variables present | Operations Lead | [ ] PASS |
| **G-06: Rollback Primed** | Previous stable deployment ID noted in Railway | Incident Commander | [ ] PASS |
| **G-07: Migration Executor** | Approved Client 01 migration executor verified (`apply-remediation-ddl.mjs` strictly prohibited) | DBA / Tech Lead (Rogelio)| [ ] PASS |

---

## 4. Release Team Roster & Communication Channel

- **Release Coordinator**: Agent C (QA / Release Designer)
- **Technical Operator**: Rogelio (Engineering Lead / Backend)
- **Product Authority**: Julian (Product Owner)
- **War Room Channel**: `#ops-release-client01` (all participants active during execution)

---

## 5. Step-by-Step Production Deployment Sequence (16 Oct 2026, authorized release window)

```
[09:45 UTC] Final Go / No-Go Poll in #ops-release-client01
     │
     ▼
[10:00 UTC] STAGE 1: Database Migration Execution
     │       Apply additive DDL via approved Client 01 migration executor
     │       (BLOCKING PREREQUISITE: apply-remediation-ddl.mjs strictly prohibited)
     ▼
[10:15 UTC] STAGE 2: Protected Promotion to Main & Production Tagging
     │       RC branch -> PR -> required checks -> peer approval -> authorized merge -> Tag integrated SHA
     ▼
[10:20 UTC] STAGE 3: Railway Deployment Execution
     │       Deploy stable-ecomerce container on Railway
     ▼
[10:28 UTC] STAGE 4: Deployment Health & Readiness Probe
     │       Poll /api/health and /api/readiness until 200 OK
     ▼
[10:35 UTC] STAGE 5: Production Smoke Validation
     │       Run scripts/qa/validate-production.ps1
     ▼
[10:45 UTC] STAGE 6: Operational Handoff & Release Declaration
```

### 5.1 Stage 1: Database Schema Migration Execution (10:00 UTC)
1. **Operator**: Rogelio (DBA / Engineering Lead)
2. **Blocking Prerequisite & Executor Policy**:
   > **MIGRATION EXECUTOR INVARIANT**:
   > `scripts/qa/database/apply-remediation-ddl.mjs` is a historical single-purpose Block C remediation script hardcoded for 2026-09-17 candidate DDL. It **MUST NEVER** be used as a migration executor for Client 01.
   > Because no approved Client 01 migration executor currently exists in the repository, the specification, review, and approval of an authoritative Client 01 migration executor (e.g., Supabase CLI runner or reviewed migration harness) is a **MANDATORY BLOCKING PREREQUISITE** prior to production release execution. Engineering must not invent ad-hoc runner scripts without formal governance review.
3. **Action**: Once the approved Client 01 migration executor is ratified and tested, apply non-destructive additive migrations to production Supabase:
   ```bash
   # Execute via the ratified Client 01 migration executor (BLOCKING PREREQUISITE)
   railway run -- <approved-client01-migration-executor-command>
   ```
4. **Verify Integrity**:
   ```bash
   railway run -- powershell -NoProfile -Command '$env:DATABASE_URL = $env:SUPABASE_DB_URL; .\scripts\qa\database\validate-database-security.ps1'
   ```
   **Threshold**: All tables have RLS enabled; critical functions secured; 0 errors.

### 5.2 Stage 2: Protected Promotion to Main & Production Tagging (10:15 UTC)
1. **Operator**: Release Coordinator / Repository Administrator
2. **Protected Promotion Protocol**:
   > **BRANCH PROTECTION RULE**: Direct push or unreviewed local merge to `main` is strictly prohibited. Production releases must follow protected promotion:
   > **`rc/client01-v1.0` -> Pull Request -> Required Status Checks -> Required Peer Approvals -> Authorized Release Integration -> Tag Actually Integrated SHA**.
3. **Step-by-Step Promotion Workflow**:
   - **Open Promotion PR**: Create a Pull Request targeting `main` from branch `rc/client01-v1.0` (title: `release: Client 01 v1.0 production release`).
   - **Required Status Checks**: Verify 100% green status on all mandatory CI checks (`quality`, `e2e`, `aggregate`).
   - **Required Peer Approval**: Ensure mandatory written peer approvals are recorded (QA Lead, Tech Lead, Product Owner).
   - **Authorized Release Integration**: Authorized Repository Administrator merges the PR into `main` via the GitHub interface (preserving linear history per branch policy).
   - **Tag the Integrated SHA**: Checkout and pull the newly integrated `main`, capture the exact SHA that was integrated, and push the release tag only:
   ```powershell
   # 1. Fetch latest integrated commit from origin/main
   git fetch origin main

   # 2. Update local main cleanly
   git checkout main
   git pull --ff-only origin main

   # 3. Capture the exact SHA integrated into main
   $INTEGRATED_SHA = $(git rev-parse HEAD)

   # 4. Tag the exact integrated commit SHA and push tag to origin
   git tag -a v1.0.0 $INTEGRATED_SHA -m "release: Client 01 v1.0 production release"
   git push origin v1.0.0
   ```
   > **NOTE**: No direct push to `main` (`git push origin main`) is permitted or required.

### 5.3 Stage 3: Railway Deployment Execution (10:20 UTC)
1. **Action**: Railway production is not assumed to auto-deploy from `main`. After explicit release authorization, the designated operator performs the controlled manual deployment:
   ```bash
   railway up --service stable-ecomerce
   ```
2. **Monitor Build**:
   ```bash
   railway logs --deployment --lines 100
   ```
   **Expected**: Vite build clean, esbuild `dist/server.cjs` bundled in < 10s, container starting on port 3000.

### 5.4 Stage 4: Health & Readiness Probe (10:28 UTC)
1. **Query Liveness**:
   ```bash
   curl -s "https://selfcaresinners.com/api/health" | jq .
   ```
   **Verify**: `status: "ok"`, `version: "<V1.0.0_COMMIT_SHA>"`.

2. **Query Deep Readiness**:
   ```bash
   curl -s "https://selfcaresinners.com/api/readiness" | jq .
   ```
   **Verify**: `status: "ready"`, all checks (`env`, `supabase`, `stripe`, `email`) report `ok: true`.

### 5.5 Stage 5: Production Smoke Validation (10:35 UTC)
Execute the non-destructive production validation suite:
```powershell
.\scripts\qa\validate-production.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -ExpectedCommit "$RELEASE_COMMIT_SHA"
```
**Pass Threshold**: 100% of synthetic smoke assertions pass; response latency < 500ms; zero 5xx errors.

---

## 6. Immediate Abort & Rollback Criteria

If any of the following occur during the release window, the Release Coordinator must immediately declare **ABORT** and execute `ROLLBACK_AND_RECOVERY.md`:

1. `GET /api/readiness` fails to report `status: "ready"` within 180 seconds of container boot.
2. Railway container enters a crash loop (> 2 restarts).
3. Production smoke validation fails on any core endpoint.
4. Live Stripe webhook processing fails signature verification.

---

## 7. Release Completion & Handoff Declaration (10:45 UTC)

When Stage 5 completes with **PASS**:
1. Release Coordinator posts formal announcement in `#general` and `#engineering`:
   > **RELEASE COMPLETE**: Client 01 v1.0 is successfully deployed to production at `https://selfcaresinners.com` on 16 Oct 2026. Health and readiness verified. Omnichannel inventory and Web POS are officially live.
2. Hand over operational monitoring to the On-Call Engineer as specified in `POST_RELEASE_VALIDATION.md`.
