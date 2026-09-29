# Feature Freeze & Release Candidate Cut Runbook

**Document ID**: `RB-FF-001`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Authority**: Mandatory Operational Runbook for Feature Freeze
**Execution Date**: **03 Oct 2026** (Mandatory & Frozen)
**Parent Epic**: `CCP-44`

---

## 1. Executive Summary & Calendar Rule

This runbook defines the exact operational procedure for executing **Feature Freeze** and cutting the **Release Candidate (RC)** for the Client 01 milestone on **03 Oct 2026**.

> **CRITICAL CALENDAR RULE (FROZEN)**:
> - **03 Oct 2026**: Feature Freeze / Release Candidate (RC cut, code freeze, branch hardening).
> - **04 Oct 2026**: Hardening + User Acceptance Testing (UAT, staging stress testing, regression sweep).
> - **05 Oct 2026**: Production Release + Handoff (canary rollout, smoke tests, post-deploy monitoring).
> *DO NOT use stale "03 Oct production handoff" language. 03 Oct is strictly for Feature Freeze and RC cut.*

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Feature Freeze occurs strictly at 17:00 UTC on 03 Oct 2026.
   - Post-freeze, no new feature pull requests may be merged into the release candidate branch.
   - Only critical bug fixes (Sev-1 / Sev-2) approved by the QA Lead may enter the branch during Hardening.

2. **FROZEN CONTRACT**:
   - Release branch must contain all frozen contracts: `DR-INV-001`, `DR-PAY-001`, `DR-IDEM-001`, `DR-AUTH-001`, `DR-ERR-001`, `DR-REC-001`.

3. **DERIVED ENGINEERING DESIGN**:
   - Release branch naming convention: `rc/client01-v1.0`.
   - Release tag naming convention: `v1.0.0-rc.1`.
   - CI stabilization verification steps and artifact archival.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Git command syntax and branch protection configuration in GitHub.

---

## 3. Pre-Freeze Readiness Checklist (T-4 Hours: 13:00 UTC, 03 Oct 2026)

Before cutting the Release Candidate branch, verify that all critical path implementation tickets are merged into `main`:

- [ ] **CCP-41**: Julian TEAM-READY validated and complete.
- [ ] **CCP-42**: Rogelio TEAM-READY validated and complete.
- [ ] **CCP-44**: Contract Freeze & Design documentation complete.
- [ ] **CCP-39**: SellableUnit foundation merged and verified.
- [ ] **CCP-12**: Inventory & SKU Schema migrations merged.
- [ ] **CCP-13**: Canonical Orders & Payment Ledger merged.
- [ ] **CCP-14**: Web POS Sales API endpoint merged.
- [ ] **CCP-43**: Web POS Frontend UI components merged.
- [ ] **CCP-16**: Automated CI testing infrastructure and quality gates fully green on `main`.

---

## 4. Branch Cut & Tagging Procedure (17:00 UTC, 03 Oct 2026)

The Release Coordinator executes the following Git procedure in a clean environment:

```powershell
# 1. Fetch latest changes from remote
git fetch origin

# 2. Check out main and ensure exact sync
git checkout main
git pull --ff-only origin main

# 3. Verify that CI on main is 100% GREEN
# (Inspect latest workflow run for HEAD commit SHA)

# 4. Create and checkout the Release Candidate branch
git checkout -b rc/client01-v1.0

# 5. Tag the initial release candidate commit
git tag -a v1.0.0-rc.1 -m "release: cut Client 01 Release Candidate 1"

# 6. Push RC branch and tag to GitHub
git push origin rc/client01-v1.0
git push origin v1.0.0-rc.1
```

---

## 5. Branch Protection & Freeze Lockdown

Immediately following branch push, the Repository Administrator configures GitHub branch protection for `rc/client01-v1.0`:

1. **Require Pull Request**: All changes must be submitted via PR. Direct pushes blocked for all users including administrators.
2. **Require Approvals**: Minimum 2 approvals required for any merge into `rc/client01-v1.0` (QA Lead + Tech Lead).
3. **Require Status Checks**:
   - `quality` (TypeScript, unit tests, secret scan, build, core regression, security baseline).
   - `e2e` (Playwright Chromium suite).
   - `aggregate` (PL20 evidence manifest).
4. **Lockdown Announcement**: Post notification in `#engineering-announcements`:
   > **ANNOUNCEMENT**: Feature Freeze is now in effect for Client 01 v1.0 as of 03 Oct 2026, 17:00 UTC. Branch `rc/client01-v1.0` has been cut. All further feature PRs are deferred to post-release v1.1. Only Sev-1/Sev-2 hardening fixes are permitted with QA Lead approval.

---

## 6. Release Candidate Verification Gate

Once the RC branch is cut and pushed, execute the full release verification suite against the RC branch:

```powershell
# Run the authoritative release quality gate
.\scripts\qa\validate-release.ps1
```

### Expected Output Summary:
- **TypeScript**: 0 errors (`tsc --noEmit` PASS).
- **Unit Tests**: 100% pass (`vitest` PASS).
- **Production Build**: Assets and server bundled successfully (`Vite` + `esbuild` PASS).
- **Secret Scan**: Clean (`scan-local-secrets.ps1` PASS).
- **Core Regression**: Verified (`validate-regression-core.ps1` PASS).
- **Security Baseline**: Clean audit report generated PASS.
- **FINAL RESULT**: **PASS**.

---

## 7. Handover to Hardening & UAT

Upon successful verification of `v1.0.0-rc.1`:
1. Deploy `rc/client01-v1.0` to the **Staging Environment**.
2. Notify the QA and UAT teams that Staging is primed for **04 Oct 2026 Hardening and User Acceptance Testing** in accordance with `HARDENING_RUNBOOK.md` and `UAT_RUNBOOK.md`.
