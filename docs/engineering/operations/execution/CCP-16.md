# Execution Pack: CCP-16 — CI Quality Gate & Automated Testing Infrastructure

**Ticket ID**: `CCP-16`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Role / Owner Profile**: QA / CI Release Engineer  
**Target Delivery**: Pre-Freeze / Continuous  
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)  

---

## 1. Objective, Context & Why

### Objective
Establish the automated Continuous Integration (CI) infrastructure and local validation scripting that enforces non-negotiable quality gates on every Pull Request and branch merge, guaranteeing zero type errors, 100% test pass rates, clean secret scanning, and automated evidence manifest generation.

### Why This Matters
Without automated, reproducible quality gates, regressions in checkout, authentication, or inventory management can reach production undetected. CCP-16 establishes the foundational safety net required for all subsequent Client 01 feature implementations (`CCP-39`, `CCP-12`, `CCP-13`, `CCP-14`, etc.).

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Zero tolerance for failing tests or compiler errors on `main`.
   - CI must execute in an isolated environment matching production runtime constraints (Node.js 22.x).
   - Secret scanning must execute automatically on every PR to prevent credential leakage.

2. **FROZEN CONTRACT**:
   - All regression suites must enforce the standardized error envelope (`DR-ERR-001`).

3. **DERIVED ENGINEERING DESIGN**:
   - Three-stage GitHub Actions workflow architecture (`quality`, `e2e`, and `aggregate`).
   - Unified local script entrypoints (`validate-fast.ps1` and `validate-release.ps1`).
   - Standardized JSON evidence emission schema (`pl20-ci-evidence-v1`).

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - PowerScript wrapper conventions and exit code assertions.

---

## 3. Scope Boundaries

- **IN SCOPE**:
  - Configuration and maintenance of `.github/workflows/quality-gate.yml`.
  - PowerShell validation runners under `scripts/qa/`.
  - Local secret detection scripts under `scripts/qa/security/`.
  - Core contract regression scripts under `scripts/qa/regression/`.
  - Automated evidence upload and JSON artifact generation.
- **EXPLICITLY OUT OF SCOPE**:
  - Modifying product source code or UI components.
  - Relaxing test assertion thresholds or silencing TypeScript warnings.
  - Deploying directly to Railway or mutating cloud infrastructure.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: None (Foundational ticket).
- **Downstream Dependents**: `CCP-44` (Contract Freeze), `CCP-39` (SellableUnit Foundation), and all subsequent development tickets.
- **Preconditions**:
  - Node.js v22.x installed.
  - Clean git working tree with locked `package-lock.json`.
  - Local PowerShell 7 or Windows PowerShell 5.1 available.

---

## 5. Step-by-Step Implementation & Execution Guide

```
[Developer Working on Branch]
             │
             ▼
[Step 1: Local Fast Validation] ──> Run npm run qa:fast (tsc + vitest + build)
             │
             ▼
[Step 2: Local Release Gate]    ──> Run npm run qa:release (adds secrets + regressions)
             │
             ▼
[Step 3: Open Pull Request]     ──> GitHub Actions quality-gate.yml triggers
             │
             ├── Stage 1: Quality Job (Lint, Unit Tests, Build, Secret Scan, Regressions)
             ├── Stage 2: E2E Job (Build, Playwright Chromium headless)
             └── Stage 3: Aggregate Job (Downloads artifacts, evaluates ALL PASS)
             │
             ▼
[Step 4: Evidence Persistence]  ──> Uploads pl20-evidence artifacts to GitHub Run
```

### Execution Commands:

1. **Inner-Loop Local Fast Gate**:
   ```powershell
   .\scripts\qa\validate-fast.ps1
   ```
2. **Comprehensive Release Validation Gate**:
   ```powershell
   .\scripts\qa\validate-release.ps1
   ```
3. **Dedicated Secret Scanner**:
   ```powershell
   .\scripts\qa\security\scan-local-secrets.ps1
   ```
4. **Security Baseline Report**:
   ```powershell
   .\scripts\qa\security\validate-security-baseline.ps1 -Mode Report
   ```

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Step | Command | Pass Criteria | Fail Criteria |
| :--- | :--- | :--- | :--- |
| **Lint / Types** | `npm run lint` | Exit code 0; 0 errors reported by `tsc --noEmit` | Exit code != 0; any syntax or type mismatch |
| **Unit Tests** | `npm test` | Exit code 0; 100% of test files and suites pass | Any failed assertion; unhandled exception |
| **Bundling** | `npm run build` | Exit code 0; Vite assets in `dist/` and `dist/server.cjs` emitted | Build crash; missing module resolution |
| **Secret Scan** | `scan-local-secrets.ps1` | Exit code 0; "No secrets found in tracked files" | Any high-entropy token or key detected |
| **Regression** | `validate-regression-core.ps1`| Exit code 0; all contract assertions verified | Contract drift or schema discrepancy |

---

## 7. Required Verifiable Evidence

Every CI run must produce and archive the following evidence artifacts:
1. `pl20-evidence/quality.json`: JSON payload containing individual step statuses (`lint`, `unit_tests`, `build`, `secret_scan`, `core_regression`, `security_baseline`).
2. `pl20-evidence/e2e.json`: JSON manifest recording browser execution results, base URL, and test duration.
3. `pl20-evidence/aggregate-summary.json`: Unified pass/fail evaluation uploaded to GitHub Actions artifact storage (retained for 30 days).

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] CI workflow `.github/workflows/quality-gate.yml` executes reliably in < 15 minutes.
- [ ] Local fast gate (`validate-fast.ps1`) executes in < 30 seconds.
- [ ] Local release gate (`validate-release.ps1`) executes in < 90 seconds.
- [ ] PR branch protection is configured to block merges on any gate failure.
- [ ] Zero secret scan false-positives on clean baseline.

### Escalation Pathway:
- If CI runner fails due to environment or dependency issues, escalate to CI Lead.
- If a pull request fails a hard gate, the author must follow the Evidence Standard (`EXPECTED -> TEST -> OBSERVED -> CAUSE -> SAFE REMEDIATION -> RETEST -> EVIDENCE`) and repair the issue before re-requesting review.
