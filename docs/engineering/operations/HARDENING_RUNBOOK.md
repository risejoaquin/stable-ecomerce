# Release Hardening & Regression Sweep Runbook

**Document ID**: `RB-HARD-001`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Authority**: Mandatory Operational Runbook for Release Hardening  
**Execution Date**: **04 Oct 2026** (Mandatory & Frozen)  
**Parent Epic**: `CCP-44`  

---

## 1. Objective & Calendar Context

This runbook specifies the protocol for executing **Release Hardening** on the Client 01 Release Candidate branch (`rc/client01-v1.0`) on **04 Oct 2026**.

Hardening is a focused period dedicated to:
- Stress testing, load testing, and concurrency verification.
- Full automated and manual regression sweeps across staging.
- Defect triage and remediation of Sev-1/Sev-2 issues only.
- Final code stabilization prior to production deployment on **05 Oct 2026**.

> **CRITICAL CALENDAR RULE (FROZEN)**:  
> **04 Oct 2026 is strictly Hardening + UAT.** Production deployment occurs on **05 Oct 2026**. Stale language referencing 03 Oct or 04 Oct production deployment is prohibited.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Zero Sev-1 or Sev-2 defects permitted at the conclusion of Hardening.
   - Any defect fix applied during hardening must include an automated regression test.
   - All bug fixes merged into the release candidate branch must be cherry-picked back into `main`.

2. **FROZEN CONTRACT**:
   - Hardening sweeps must assert adherence to all frozen contracts: `DR-INV-001`, `DR-PAY-001`, `DR-IDEM-001`, `DR-AUTH-001`, `DR-ERR-001`, `DR-REC-001`.

3. **DERIVED ENGINEERING DESIGN**:
   - Regression sweep execution order (Automated CI -> Staging Functional -> Concurrency -> Security).
   - Defect triage criteria and emergency PR turnaround procedure.
   - RC version incrementing rules (`v1.0.0-rc.1` -> `v1.0.0-rc.2`).

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Bugfix branch naming (`fix/rc-defect-<issue-id>`).

---

## 3. Hardening Day Timeline (04 Oct 2026)

```
08:00 UTC - Staging Deployment Verification of v1.0.0-rc.1
09:00 UTC - Automated Regression Sweep (Playwright E2E + API Tests)
11:00 UTC - Concurrency & Load Stress Sweep (CCP-36)
13:00 UTC - Stakeholder User Acceptance Testing (UAT_RUNBOOK.md)
15:00 UTC - Mid-Day Defect Triage & Blocker Review
16:00 UTC - Remediation PR Merges & RC Tag Cut (v1.0.0-rc.2 if needed)
19:00 UTC - Final Regression Verification on Staging
21:00 UTC - Production Readiness Review & Sign-Off (CCP-37)
```

---

## 4. Defect Triage Criteria During Hardening

During hardening, engineering bandwidth is strictly preserved for release-blocking defects.

| Severity | Criteria | Action During Hardening |
| :--- | :--- | :--- |
| **Sev-1 (Critical)** | Data corruption, payment breakdown, inventory leak, auth bypass | **RELEASE BLOCKER**: Stop testing, mobilize senior engineers, patch immediately |
| **Sev-2 (Major)** | Core workflow impaired (e.g., card reference POS failing, receipt print corrupt) | **RELEASE BLOCKER**: Requires hotfix PR into RC branch before 18:00 UTC |
| **Sev-3 (Minor)** | Cosmetic UI flaw, non-critical admin navigation glitch, edge-case warning | **DEFERRED**: Log in Jira for post-release sprint (v1.1); do NOT patch during hardening |
| **Sev-4 (Low)** | Copy typo, minor styling inconsistency | **DEFERRED**: Backlog item |

---

## 5. Hardening Regression Sweeps

### 5.1 Sweep 1: Core Automated Regression
Run against the Staging environment:
```powershell
# Execute the complete automated regression suite
.\scripts\qa\validate-release.ps1
```
Verify that all 5 automated quality dimensions report **PASS**.

### 5.2 Sweep 2: End-to-End POS Functional Matrix
Execute Playwright test suites covering:
1. **POS Cash Tender**: `tests/e2e/pos-cash-sale.spec.ts`
2. **POS External Card Reference**: `tests/e2e/pos-card-sale.spec.ts`
3. **POS Receipt Generation**: `tests/e2e/pos-receipt.spec.ts`
4. **POS Refund & Restock**: `tests/e2e/pos-refund-restock.spec.ts`
5. **POS Auth Guard**: `tests/e2e/pos-auth-matrix.spec.ts`

### 5.3 Sweep 3: Concurrency & Inventory Lock Stress
Execute the concurrency test suite under `CCP-36`:
- Dispatch 50 concurrent requests targeting a `SellableUnit` with exactly 5 available units.
- **Pass Assertion**: Exactly 5 requests receive `200 OK` / `201 Created`; 45 receive `409 Conflict` (`INSUFFICIENT_STOCK`); zero deadlock; final inventory = 0.

### 5.4 Sweep 4: Database & Security Audit
Execute Supabase live security validation:
```powershell
.\scripts\qa\database\validate-database-security.ps1
```
- Assert that all 280 public tables have RLS enabled.
- Assert that critical functions have explicit `search_path` and restricted `anon` execute permissions.

---

## 6. Remediation Workflow for Hardening Defect Fixes

If a Sev-1 or Sev-2 defect is identified during hardening, follow the accelerated patch process:

```
[Defect Reported & Verified with Evidence]
                  │
                  ▼
[Create Branch: fix/rc-defect-<JiraID> from rc/client01-v1.0]
                  │
                  ▼
[Author Minimal Fix + Regression Test (EXPECTED -> TEST -> OBSERVED...)]
                  │
                  ▼
[Local Validation: npm run qa:fast]
                  │
                  ▼
[PR targeting rc/client01-v1.0 -> CI Quality Gate PASS -> 2 Approvals]
                  │
                  ▼
[Merge into rc/client01-v1.0 -> Tag v1.0.0-rc.2]
                  │
                  ▼
[Cherry-pick commit to main to prevent regression drift]
```

---

## 7. Hardening Exit Criteria

The Hardening phase is officially concluded and marked **PASS** when:
1. 100% of regression sweeps (Functional, Concurrency, Security, UAT) have passed on Staging.
2. Zero Sev-1 or Sev-2 defects remain unresolved.
3. Final RC tag (e.g. `v1.0.0-rc.2` or `v1.0.0-rc.1`) is frozen and deployed to Staging.
4. The QA Lead issues the formal **Release Gate Recommendation** for the **05 Oct 2026 Production Release**.
