# Execution Pack: CCP-35 — Staging Deployment, Smoke Testing & Parity Verification

**Ticket ID**: `CCP-35`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Role / Owner Profile**: DevOps Engineer / Release Engineer / QA Lead
**Target Delivery**: 04 Oct 2026 (Hardening & Staging Verification)
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)
**Status**: `BLOCKED / PARTIAL` (Missing staging Playwright configuration blocks completion gate)

---

## 1. Objective, Context & Why

### Objective
Deploy the Client 01 Release Candidate (`rc/client01-v1.0`) to the isolated Staging environment, verify complete environment and configuration parity with production, execute automated smoke and regression validation suites, execute full browser E2E test suites against the remote staging environment, and capture verifiable proof of operational readiness.

### Why This Matters
Production is never the place for first-time integration testing. Deploying to an isolated staging environment with bit-for-bit parity in schema, secrets, Node version, and CORS headers guarantees that configuration drift or missing environment variables are eliminated before the **05 Oct 2026** production deployment. Staging verification is only complete when both automated smoke sweeps and real browser E2E transactions succeed against the remote staging instance.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Staging must be fully isolated from live production data and production Stripe keys.
   - Release Candidate must pass 100% of automated smoke tests AND 100% of remote browser E2E test suites on Staging before staging verification sign-off or production release sign-off.
   - Successful remote browser E2E execution against Staging is a non-negotiable completion requirement; missing Playwright staging support is an active blocker to sign-off, NOT a substitute for the gate. CCP-35 remains BLOCKED or PARTIAL until an approved staging-capable configuration/procedure exists AND remote browser E2E is actually executed successfully against staging.
   - Database migrations must be applied to Staging first and proven non-destructive (via approved Client 01 migration executor; `apply-remediation-ddl.mjs` strictly prohibited).

2. **FROZEN CONTRACT**:
   - `DR-INV-001`, `DR-PAY-001`, `DR-IDEM-001`, `DR-AUTH-001`, `DR-ERR-001`, `DR-REC-001` enforced on Staging.

3. **DERIVED ENGINEERING DESIGN**:
   - Staging automated smoke runner using `scripts/qa/validate-production.ps1` with `-BaseUrl`.
   - Staging environment parity verification rubric adhering to `STAGING_VALIDATION.md`.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Staging domain URL: `https://staging.selfcaresinners.com` (or Railway preview domain).

---

## 3. Scope Boundaries

- **IN SCOPE**:
  - Deploying `rc/client01-v1.0` to Railway isolated Staging service.
  - Applying additive schema migrations to Supabase Staging database via approved Client 01 executor.
  - Running `/api/health` and `/api/readiness` verification.
  - Running automated production smoke script against Staging (`validate-production.ps1 -BaseUrl`).
  - Executing full automated browser E2E regression suite against Staging URL (MANDATORY COMPLETION GATE; currently BLOCKED pending approved staging Playwright configuration/procedure).
  - Auditing Playwright staging configuration and establishing the staging-capable runner prerequisite and evidence standards.
- **EXPLICITLY OUT OF SCOPE**:
  - Deploying to production environment.
  - Running tests against live production customer data.
  - Claiming unsupported Playwright `BASE_URL` staging coverage under current configuration.
  - Substituting documentation of the missing configuration for actual remote browser E2E execution against staging.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: `CCP-16` (CI Quality Gate), `CCP-31` (Database Migration Verification), `CCP-33` (POS Sales E2E), `CCP-34` (POS Refund E2E).
- **Downstream Dependents**: `CCP-36` (Concurrency Load Test), `CCP-37` (Release Gate Sign-off), `CCP-38` (Production Release).
- **Preconditions**:
  - Railway staging service active with matching resource allocation.
  - Supabase staging database provisioned with RLS enabled.
  - Stripe Test mode webhook configured.
  - Approved Client 01 database migration executor ratified and tested (BLOCKING PREREQUISITE: `scripts/qa/database/apply-remediation-ddl.mjs` is strictly prohibited).
  - Playwright Remote Staging Configuration Prerequisite: Current root `playwright.config.ts` hardcodes `baseURL: 'http://localhost:3000'` and does not evaluate `process.env.BASE_URL` (and launches a local `webServer`). Remote Playwright browser execution against staging is therefore UNSUPPORTED under current repository configuration and represents an ACTIVE BLOCKER. CCP-35 completion is strictly BLOCKED until an approved staging-capable procedure/config exists AND browser E2E is actually executed successfully against staging. Documenting this prerequisite does NOT satisfy the completion gate.

---

## 5. Step-by-Step Implementation & Verification Guide

```
[Release Candidate Branch v1.0.0-rc.1 Cut on 03 Oct]
                       │
                       ▼
[Step 1: Staging Database Migration Execution]
         Apply additive migrations via approved Client 01 executor
         (BLOCKING PREREQUISITE: apply-remediation-ddl.mjs strictly prohibited)
                       │
                       ▼
[Step 2: Deploy RC to Railway Staging Service]
         railway up --service stable-ecomerce-staging
                       │
                       ▼
[Step 3: Staging Liveness & Readiness Probes]
         Poll /api/health & /api/readiness -> Assert 200 OK
                       │
                       ▼
[Step 4: Automated Smoke Suite Execution]
         Run scripts/qa/validate-production.ps1 -BaseUrl "https://staging.selfcaresinners.com"
                       │
                       ▼
[Step 5: Remote Staging Browser E2E Suite Execution]
         Execute Playwright E2E suite against Staging URL
         (ACTIVE BLOCKER: Requires approved staging Playwright config;
          DoD strictly BLOCKED until browser E2E passes against staging)
                       │
                       ▼
[Step 6: Staging Parity Evidence Artifact Persistence]
```

### Execution Commands:

1. **Deploy to Staging Service**:
   ```bash
   railway up --service stable-ecomerce-staging
   ```

2. **Verify Staging Readiness**:
   ```bash
   curl -s "https://staging.selfcaresinners.com/api/readiness" | jq .
   ```
   **Threshold**: HTTP 200, `status: "ready"`, all checks `ok: true`.

3. **Execute Automated Staging Smoke**:
   ```powershell
   .\scripts\qa\validate-production.ps1 `
     -BaseUrl "https://staging.selfcaresinners.com" `
     -ExpectedCommit "$RC_COMMIT_SHA"
   ```

4. **Remote Staging Browser E2E Regression & Playwright Configuration Blocker**:
   > **PLAYWRIGHT STAGING CONFIGURATION BLOCKER & MANDATORY COMPLETION GATE**:
   > Inspection of `playwright.config.ts` confirms that `baseURL: 'http://localhost:3000'` is statically hardcoded, `webServer` is hardcoded to spin up a local server, and `process.env.BASE_URL` is **NOT** evaluated.
   > Running `BASE_URL="https://staging.selfcaresinners.com" npx playwright test` does **NOT** target the staging environment.
   > **Do not claim BASE_URL staging coverage** under current repository configuration. Dynamic `BASE_URL` support and conditional `webServer` disabling in `playwright.config.ts` represent a **BLOCKING PREREQUISITE** for remote Playwright execution.
   >
   > **HARD COMPLETION GATE INVARIANT**:
   > Missing staging Playwright support is an active blocker to CCP-35 completion and staging sign-off, **NOT** a substitute for the gate. Automated HTTP smoke tests (`validate-production.ps1 -BaseUrl`) provide initial baseline connectivity, but CANNOT replace browser E2E execution.
   > CCP-35 remains **BLOCKED / PARTIAL** until:
   > 1. An approved staging-capable Playwright procedure/configuration exists.
   > 2. The full browser E2E test suite is actually executed successfully (100% pass) against the remote staging environment (`https://staging.selfcaresinners.com`).
   >
   > Whenever remote Playwright staging execution is performed, test evidence **MUST** record:
   > 1. The **effective tested URL** (verifiable proof in logs and reports that browser requests reached `https://staging.selfcaresinners.com`, not `localhost:3000`).
   > 2. The **deployed SHA** of the staging service under test (retrieved directly from `GET https://staging.selfcaresinners.com/api/health` before and after test execution).

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Check | Target | Pass Threshold | Fail Threshold |
| :--- | :--- | :--- | :--- |
| **Commit SHA Match** | `/api/health` | Returns exact Git SHA of `v1.0.0-rc.1` | Mismatched SHA or `local` |
| **Readiness Status** | `/api/readiness` | `status: "ready"`; DB latency < 200ms | `degraded` or missing env var |
| **Smoke Suite** | `validate-production.ps1`| 100% of assertions pass against staging URL | Any failed assertion |
| **E2E Browser Suite** | Remote Playwright on Staging | 100% pass against remote Staging URL with recorded effective URL & deployed SHA (HARD GATE: currently BLOCKED pending staging config) | Any failed flow, locator failure, or attempting sign-off without successful remote browser execution |
| **Parity Check** | CSP & Security Headers | Strict CSP, HSTS, CORS active | Weakened headers or CORS errors |

---

## 7. Required Verifiable Evidence

1. **Staging Readiness Response**:
   JSON snapshot saved to `artifacts/staging/readiness-report.json`.
2. **Staging Smoke Execution Output**:
   Persisted log showing all smoke assertions green against staging URL (`artifacts/staging/staging-smoke.log`).
3. **Playwright Staging E2E Execution Evidence (MANDATORY COMPLETION GATE)**:
   - Full HTML/JSON browser execution report persisted to `artifacts/staging/e2e-report/` proving 100% pass rate.
   - **Effective Tested URL**: Verifiable terminal log and test report capturing the actual target host (`https://staging.selfcaresinners.com`) rather than `localhost:3000`.
   - **Deployed SHA**: Exact Git SHA retrieved from `https://staging.selfcaresinners.com/api/health` before and after test execution matching the Release Candidate commit.
   - *Status Note*: Because current `playwright.config.ts` does not support remote staging targets, this evidence cannot be generated today. Documenting the configuration prerequisite does NOT satisfy this requirement; CCP-35 remains **BLOCKED / PARTIAL** until an approved staging-capable config/procedure exists AND browser E2E is successfully executed against staging.

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] `rc/client01-v1.0` successfully deployed to Staging on 04 Oct 2026.
- [ ] Database migrations applied via approved Client 01 migration executor (BLOCKING PREREQUISITE: `apply-remediation-ddl.mjs` strictly prohibited).
- [ ] Staging readiness probe returns `ready` with sub-200ms DB latency.
- [ ] 100% of automated smoke and API regression tests pass against Staging URL (`https://staging.selfcaresinners.com`).
- [ ] 100% of automated Playwright browser E2E tests pass against remote Staging URL (MANDATORY COMPLETION GATE: CCP-35 remains BLOCKED until approved staging-capable config exists AND browser E2E passes with verified effective URL and deployed SHA; documenting the blocker is NOT a substitute for this gate).
- [ ] Staging Parity & E2E Evidence Artifact (capturing effective tested URL and deployed SHA) archived for the Production Readiness Review (`CCP-37`).

### Ticket Completion Status:
- **Current State**: **BLOCKED / PARTIAL**
- **Blocking Reason**: Current root `playwright.config.ts` lacks dynamic remote staging configuration (hardcoded `localhost:3000` and `webServer`), preventing remote browser E2E execution against staging.
- **Unblocking Requirement**: An approved staging-capable Playwright configuration/procedure must be established, and full browser E2E suites must pass 100% against the staging environment with effective URL and deployed SHA evidence captured. Merely documenting the gap does NOT unblock or complete this ticket.

### Escalation Pathway:
- If Staging deployment fails or exhibits container crashes, escalate to DevOps / Release Engineer immediately.
- If E2E tests uncover regression defects on Staging, log as Sev-2 and triage via `HARDENING_RUNBOOK.md`.
- If staging-capable Playwright runner configuration is not approved prior to hardening window, escalate immediately to QA Lead and Engineering Lead as a release-blocking dependency.
