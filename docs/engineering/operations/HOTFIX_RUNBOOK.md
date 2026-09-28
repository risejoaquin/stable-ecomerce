# Emergency Production Hotfix Runbook

**Document ID**: `RB-HOT-001`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Authority**: Mandatory Operational Protocol for Emergency Hotfixes  
**Target Release**: Post-v1.0 Operations (Post-05 Oct 2026)  
**Parent Epic**: `CCP-44`  

---

## 1. Purpose & Scope Boundaries

The Emergency Hotfix Runbook governs the accelerated lifecycle for resolving **Sev-1 (Critical)** and **Sev-2 (Major)** defects that emerge in the live production environment and cannot wait for the standard weekly release cycle.

> **NON-NEGOTIABLE SAFETY INVARIANT**:  
> While the review process is expedited, **NO UNTESTED CODE ENTERS PRODUCTION**. Every hotfix must include an automated regression test, pass type verification, pass secret scanning, and be verified on Staging prior to live deployment.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Hotfixes are reserved exclusively for verified Sev-1 and Sev-2 production incidents.
   - Every hotfix must be based directly on the currently deployed production commit.
   - All hotfixes must be cherry-picked back into `main` immediately to prevent regression in future releases.

2. **FROZEN CONTRACT**:
   - Hotfixes must not alter or violate frozen contracts (`DR-INV-001`, `DR-PAY-001`, etc.) without formal architecture review.

3. **DERIVED ENGINEERING DESIGN**:
   - Accelerated gate requirements: TypeScript compilation, unit test suite, production build, secret scan.
   - Hotfix versioning convention: Semantic patch version increment (`v1.0.1`, `v1.0.2`).
   - Expedited single-approver protocol (QA Lead or Engineering Lead).

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Branch naming format: `hotfix/v<target-version>-<jira-id>-<slug>`.

---

## 3. Hotfix Lifecycle & Workflow

```
[Sev-1 / Sev-2 Production Incident Confirmed]
                     │
                     ▼
[Step 1: Branch Cut from Production Tag]
         git checkout -b hotfix/v1.0.1-CCP-99-fix v1.0.0
                     │
                     ▼
[Step 2: Minimal Remediation + Regression Test]
         Follow Evidence Standard: EXPECTED -> TEST -> OBSERVED...
                     │
                     ▼
[Step 3: Accelerated Local Verification]
         Run npm run qa:fast + Secret Scanner
                     │
                     ▼
[Step 4: Expedited Review & PR to Staging]
         Single approval from QA Lead or Tech Lead
                     │
                     ▼
[Step 5: Staging Sanity Verification (15 mins)]
         Verify fix and ensure zero collateral regression
                     │
                     ▼
[Step 6: Production Deployment & Tagging]
         Deploy to Railway -> Verify /api/health -> Tag v1.0.1
                     │
                     ▼
[Step 7: Upstream Cherry-Pick to Main]
         git checkout main -> git cherry-pick <hotfix-commit> -> git push
```

---

## 4. Accelerated Quality Requirements

Even during an active emergency, the following quality controls are mandatory:

| Check | Tool / Command | Requirement | Can be Bypassed? |
| :--- | :--- | :--- | :--- |
| **Defect Regression Test** | `npm test -- <test-file>` | Must fail before fix, pass after fix | **NO** (Strictly Prohibited) |
| **Type Verification** | `npm run lint` (`tsc --noEmit`) | 0 TypeScript errors | **NO** |
| **Application Build** | `npm run build` | Clean client & server build | **NO** |
| **Secret Scan** | `.\scripts\qa\security\scan-local-secrets.ps1` | Zero secrets in diff | **NO** |
| **Staging Validation** | Staging preview deployment | 10-minute sanity test | Only if staging is offline |

---

## 5. Step-by-Step Execution Protocol

### Step 1: Branch Cut
```powershell
# Fetch latest production tags
git fetch origin --tags

# Cut hotfix branch directly from current production tag
git checkout -b hotfix/v1.0.1-payment-rounding v1.0.0
```

### Step 2: Implementation & Regression Test Authoring
1. Author the minimal correct patch.
2. Add a permanent automated test in `tests/` reproducing the exact failure scenario.
3. Validate locally:
   ```powershell
   npm run qa:fast
   .\scripts\qa\security\scan-local-secrets.ps1
   ```

### Step 3: Expedited Review & Staging Sanity
1. Push branch: `git push origin hotfix/v1.0.1-payment-rounding`.
2. Open Pull Request targeting `main` (or a dedicated hotfix branch).
3. Request priority review from Tech Lead (Rogelio) or QA Lead (Agent C).
4. Deploy the hotfix commit to the isolated Staging environment and run smoke verification:
   ```powershell
   .\scripts\qa\validate-production.ps1 -BaseUrl "https://staging.selfcaresinners.com"
   ```

### Step 4: Production Deployment & Tagging
1. Deploy hotfix commit to Railway production:
   ```bash
   railway up --service stable-ecomerce
   ```
2. Verify production health:
   ```bash
   curl -s "https://selfcaresinners.com/api/health" | jq '{status, version}'
   ```
3. Tag the hotfix release:
   ```powershell
   git tag -a v1.0.1 -m "hotfix: resolve payment rounding precision in POS checkout"
   git push origin v1.0.1
   ```

### Step 5: Upstream Cherry-Pick to Main
To ensure the fix is not overwritten by the next regular release:
```powershell
git checkout main
git pull origin main
git cherry-pick <HOTFIX_COMMIT_SHA>
git push origin main
```

---

## 6. Post-Hotfix Audit & Incident Closure

Within 24 hours of hotfix deployment:
1. Update the incident ticket in Jira with:
   - Root cause and remediation description.
   - Deployed commit SHA and hotfix tag.
   - Verification test evidence.
2. Verify that the automated regression test is executing green in the regular CI pipeline.
3. Close the incident and schedule the post-mortem review per `INCIDENT_RESPONSE.md`.
