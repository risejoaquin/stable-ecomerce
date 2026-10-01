# Execution Pack: CCP-38 — Production Release Execution & Post-Deploy Handoff

**Ticket ID**: `CCP-38`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Role / Owner Profile**: Release Coordinator / DevOps Lead / Engineering Lead
**Target Delivery**: **05 Oct 2026** (Production Release Day)
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)

---

## 1. Objective, Context & Why

### Objective
Execute the production release of Client 01 v1.0 on **05 Oct 2026**, apply verified database schema migrations to production Supabase, trigger zero-downtime container deployment on Railway, execute non-destructive automated production smoke tests, conduct a 60-minute telemetry observation window, and formally hand over operations to the steady-state support team.

### Why This Matters
CCP-38 is the operational capstone of the Client 01 initiative. It translates all prior design, hardening, and testing into a successful, deterministic production go-live. By following a structured deployment protocol with automated post-deploy validation and immediate rollback readiness, live customer and retail operations are fully safeguarded.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Production deployment executes strictly on **05 Oct 2026**.
   - Deployment must be non-disruptive and zero-downtime via Railway container orchestration.
   - Database migrations must be applied and verified before routing live traffic to the new application release.
   - All synthetic smoke validation in production must be non-destructive.

2. **FROZEN CONTRACT**:
   - Enforce `DR-INV-001`, `DR-PAY-001`, `DR-IDEM-001`, `DR-AUTH-001`, `DR-ERR-001`, `DR-REC-001`.

3. **DERIVED ENGINEERING DESIGN**:
   - Six-stage release execution sequence adhering to `PRODUCTION_RELEASE_RUNBOOK.md`.
   - Post-release validation and 60-minute telemetry observation protocol (`POST_RELEASE_VALIDATION.md`).
   - Operational handoff certificate and transition procedure.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Railway CLI deployment commands and GitHub Actions release workflow triggering.

---

## 3. Scope Boundaries

- **IN SCOPE**:
  - Promoting `rc/client01-v1.0` into `main` via protected PR, verifying required checks and peer approval, authorizing release integration, and tagging the integrated SHA (`v1.0.0`).
  - Executing additive database migrations against production Supabase.
  - Deploying service `stable-ecomerce` on Railway (`heroic-solace`).
  - Executing `scripts/qa/validate-production.ps1` against `https://selfcaresinners.com`.
  - Monitoring Pino logs and Sentry error streams for 60 minutes.
  - Executing formal operational handoff.
- **EXPLICITLY OUT OF SCOPE**:
  - Ad-hoc code modifications during deployment.
  - Destructive database alterations or table drops.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: `CCP-37` (Release Gate Sign-off & PRR Approval — Mandatory Blocker).
- **Downstream Dependents**: Steady-State Production Operations.
- **Preconditions**:
  - Unanimous GO decision recorded in `CCP-37`.
  - Production Supabase PITR backup snapshot verified.
  - All 11 required production secrets active in Railway environment.
  - Approved Client 01 database migration executor ratified and tested (BLOCKING PREREQUISITE: `scripts/qa/database/apply-remediation-ddl.mjs` is strictly prohibited).

---

## 5. Step-by-Step Implementation & Execution Guide

```
[05 Oct 2026, 09:45 UTC: War Room Convenes in #ops-release-client01]
                                 │
                                 ▼
[Stage 1: 10:00 UTC - Production Database Migration]
 Apply additive migrations via approved Client 01 executor
 (BLOCKING PREREQUISITE: apply-remediation-ddl.mjs strictly prohibited)
                                 │
                                 ▼
[Stage 2: 10:15 UTC - Protected Promotion to Main & Production Tag Cut]
 RC -> PR to main -> Required checks -> Peer approval -> Authorized merge -> Tag integrated SHA
                                 │
                                 ▼
[Stage 3: 10:20 UTC - Railway Service Deployment]
 Trigger deploy of stable-ecomerce; monitor container build & boot
                                 │
                                 ▼
[Stage 4: 10:28 UTC - Health & Deep Readiness Probe]
 Query /api/health and /api/readiness -> Confirm status "ready"
                                 │
                                 ▼
[Stage 5: 10:35 UTC - Automated Production Smoke Sweep]
 Run .\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com"
                                 │
                                 ▼
[Stage 6: 10:45 to 11:45 UTC - 60-Minute Telemetry Observation Window]
 Monitor Sentry, Pino JSON streams, Stripe Webhooks, DB latency
                                 │
                                 ▼
[Stage 7: 11:45 UTC - Operational Handoff Sign-Off & Stand-down]
```

### Execution Commands:

1. **Apply Production Database Migrations**:
   > **MIGRATION EXECUTOR INVARIANT**:
   > `scripts/qa/database/apply-remediation-ddl.mjs` is a historical single-purpose Block C remediation script hardcoded for 2026-09-17 candidate DDL. It **MUST NEVER** be used as a migration executor for Client 01.
   > Because no approved Client 01 migration executor currently exists in the repository, the specification, review, and approval of an authoritative Client 01 migration executor is a **MANDATORY BLOCKING PREREQUISITE** prior to production release execution. Engineering must not invent ad-hoc runner scripts without formal governance review.
   > Once the approved executor is ratified and tested, execute:
   ```bash
   # Run approved Client 01 migration executor (BLOCKING PREREQUISITE)
   railway run -- <approved-client01-migration-executor-command>
   ```

2. **Protected Promotion to Main & Tagging**:
   > **PROTECTED PROMOTION INVARIANT**: Direct pushes and unreviewed local merges to `main` are strictly forbidden by branch protection rules. Promotion must proceed via:
   > **`rc/client01-v1.0` -> Pull Request -> Required CI Checks -> Required Peer Approval -> Authorized Release Integration -> Tag Integrated SHA**.
   ```powershell
   # 1. Fetch latest integrated commit from origin/main after PR merge
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
   > **NOTE**: Direct push to `main` (`git push origin main`) is strictly prohibited. Tag the SHA actually integrated.

3. **Verify Production Liveness & Commit**:
   ```bash
   curl -s "https://selfcaresinners.com/api/health" | jq .
   ```
   **Verify**: `status: "ok"`, `version: "<V1.0.0_COMMIT_SHA>"`.

4. **Verify Production Deep Readiness**:
   ```bash
   curl -s "https://selfcaresinners.com/api/readiness" | jq .
   ```
   **Verify**: `status: "ready"`, all subsystems `ok: true`.

5. **Execute Automated Production Smoke**:
   ```powershell
   .\scripts\qa\validate-production.ps1 `
     -BaseUrl "https://selfcaresinners.com" `
     -ExpectedCommit "$RELEASE_COMMIT_SHA"
   ```

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Check | Target | Pass Threshold | Fail Threshold |
| :--- | :--- | :--- | :--- |
| **Deployed SHA** | `/api/health` | Matches `v1.0.0` commit SHA exactly | Mismatched SHA |
| **Readiness Status** | `/api/readiness` | HTTP 200, `status: "ready"`, DB latency < 150ms | HTTP 503 or `degraded` |
| **Smoke Suite** | `validate-production.ps1`| 100% assertions PASS; latency < 500ms | Any failure -> Triggers Rollback |
| **Telemetry (60m)** | Sentry / Pino | 0 new unhandled exceptions; 5xx rate < 0.1% | 5xx rate > 1.0% |
| **Stripe Webhooks** | Stripe Dashboard | 100% webhook delivery success | Signature verification failures |

---

## 7. Required Verifiable Evidence

1. **Production Smoke Execution Log**:
   Archived at `artifacts/release/2026-10-05-production-smoke.log`.
2. **Production Readiness API Response Snapshot**:
   JSON file saved to `artifacts/release/2026-10-05-readiness.json`.
3. **Signed Operational Handoff Certificate**:
   Completed certificate archived under `docs/engineering/operations/POST_RELEASE_VALIDATION.md`.

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] Database migrations applied via approved Client 01 migration executor and verified on production Supabase.
- [ ] Railway service `stable-ecomerce` running active with `v1.0.0` commit.
- [ ] 100% of automated production smoke assertions pass.
- [ ] 60-minute telemetry observation window concludes with zero Sev-1 or Sev-2 incidents.
- [ ] Formal Operational Handoff Certificate signed by Release Coordinator, Engineering Lead, Product Owner, and Operations On-Call.

### Escalation Pathway:
- If container deployment fails or smoke validation fails, immediately invoke `ROLLBACK_AND_RECOVERY.md`.
- If an unexpected Sev-1 defect occurs during the 60-minute observation window, page the Incident Commander and assess hotfix vs rollback.
