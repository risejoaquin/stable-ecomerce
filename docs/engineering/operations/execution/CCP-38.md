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
  - Merging `rc/client01-v1.0` into `main` and pushing tag `v1.0.0`.
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

---

## 5. Step-by-Step Implementation & Execution Guide

```
[05 Oct 2026, 09:45 UTC: War Room Convenes in #ops-release-client01]
                                 │
                                 ▼
[Stage 1: 10:00 UTC - Production Database Migration]
 Apply scripts/qa/database/apply-remediation-ddl.mjs to live Supabase DB
                                 │
                                 ▼
[Stage 2: 10:15 UTC - Git Merge & Production Tag Cut]
 Fast-forward merge rc/client01-v1.0 -> main; tag v1.0.0; push to origin
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
   ```bash
   railway run -- powershell -NoProfile -Command '$env:DATABASE_URL = $env:SUPABASE_DB_URL; .\scripts\qa\database\apply-remediation-ddl.mjs'
   ```

2. **Merge & Tag Production Release**:
   ```powershell
   git checkout main
   git merge --ff-only rc/client01-v1.0
   git tag -a v1.0.0 -m "release: Client 01 v1.0 production release"
   git push origin main
   git push origin v1.0.0
   ```

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
- [ ] Database migrations applied and verified on production Supabase.
- [ ] Railway service `stable-ecomerce` running active with `v1.0.0` commit.
- [ ] 100% of automated production smoke assertions pass.
- [ ] 60-minute telemetry observation window concludes with zero Sev-1 or Sev-2 incidents.
- [ ] Formal Operational Handoff Certificate signed by Release Coordinator, Engineering Lead, Product Owner, and Operations On-Call.

### Escalation Pathway:
- If container deployment fails or smoke validation fails, immediately invoke `ROLLBACK_AND_RECOVERY.md`.
- If an unexpected Sev-1 defect occurs during the 60-minute observation window, page the Incident Commander and assess hotfix vs rollback.
