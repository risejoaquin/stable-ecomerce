# CI Quality Gates & Pull Request Governance Model

**Document ID**: `CI-GATE-001`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Authority**: Mandatory Continuous Integration Standard
**Target Release**: Client 01 v1.0
**Parent Epic**: `CCP-16` / `CCP-44`

---

## 1. Purpose & Core Invariant

The Continuous Integration (CI) pipeline serves as the authoritative, non-negotiable verification gate for all code merged into the `main` branch and candidate release branches.

> **PRIMARY INVARIANT**:
> **NO MERGE WHEN REQUIRED CI FAILS. NO DONE WITHOUT VERIFIABLE EVIDENCE. NO WEAKENING CONTROLS TO MAKE A GATE GREEN.**

Under no circumstances may tests be disabled (`.skip`), type checks silenced (`@ts-ignore`), lint rules relaxed, or coverage thresholds lowered to force a green pipeline.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Zero regression tolerance on existing ecommerce and payment flows.
   - Every merged PR must pass automated CI checks on Windows Server GitHub Actions runners.
   - No untracked or undocumented code changes permitted into release branches.

2. **FROZEN CONTRACT**:
   - All API endpoints must adhere to `DR-ERR-001` error envelope standard.
   - All inventory mutations must adhere to `DR-INV-001` SellableUnit constraints.
   - All payments must record against `DR-PAY-001` order payments ledger.

3. **DERIVED ENGINEERING DESIGN**:
   - Hard gate threshold parameters (100% test pass rate, 0 type errors, clean secret scan).
   - Evidence artifact emission (`pl20-evidence/quality.json`, `pl20-evidence/e2e.json`).
   - GitHub Actions workflow matrix: `quality`, `e2e`, and `aggregate` jobs.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Local execution script shortcuts (`npm run qa:fast`, `npm run qa:release`).
   - Granular reporter formatting in Playwright and Vitest runners.

---

## 3. The Quality Gate Matrix

The CI pipeline runs automatically on all pull requests targeting `main` and on all direct pushes to `main`. It comprises three interdependent execution stages defined in `.github/workflows/quality-gate.yml`:

```
+-------------------------------------------------------------------------+
|                           PR QUALITY PIPELINE                           |
+-------------------------------------------------------------------------+
|                                                                         |
|  [Stage 1: Quality Job] (Runs in parallel with Stage 2)                 |
|  ├── 1.1 Checkout & Node 22 setup                                       |
|  ├── 1.2 npm ci (Strict locked dependencies)                           |
|  ├── 1.3 TypeScript Compilation (npm run lint -> tsc --noEmit)          |
|  ├── 1.4 Unit Tests (npm test -> vitest run)                            |
|  ├── 1.5 Application Build (npm run build -> Vite + esbuild server.ts)  |
|  ├── 1.6 Secret Scan (scripts/qa/security/scan-local-secrets.ps1)       |
|  ├── 1.7 Core Regressions (scripts/qa/regression/validate-core.ps1)    |
|  └── 1.8 Security Baseline (validate-security-baseline.ps1 -Mode Report)|
|                                                                         |
|  [Stage 2: E2E Browser Job]                                             |
|  ├── 2.1 Checkout & Node 22 setup                                       |
|  ├── 2.2 npm ci                                                         |
|  ├── 2.3 Application Build & Server Bootstrap                           |
|  ├── 2.4 Playwright Chromium Installation                               |
|  └── 2.5 Playwright E2E Suite (npm run test:e2e)                        |
|                                                                         |
|  [Stage 3: Aggregate Gate & Evidence Manifest]                          |
|  ├── 3.1 Download Stage 1 & Stage 2 evidence artifacts                  |
|  ├── 3.2 Evaluate overall status (ALL MUST PASS)                        |
|  └── 3.3 Emit PL20 Aggregate Evidence Manifest                          |
+-------------------------------------------------------------------------+
```

### Detailed Gate Specifications

| Gate ID | Step Name | Command | Success Threshold | Failure Action |
| :--- | :--- | :--- | :--- | :--- |
| **GATE-01** | Dependency Integrity | `npm ci` | Clean install; lockfile matches `package-lock.json` exactly; 0 integrity mismatch | Immediate Job Abort |
| **GATE-02** | Type Verification | `npm run lint` (`tsc --noEmit`) | 0 TypeScript errors; 0 unused variable warnings | Block PR Merge |
| **GATE-03** | Unit Test Suite | `npm test` (`vitest run`) | 100% pass rate; 0 failures; 0 unhandled exceptions | Block PR Merge |
| **GATE-04** | Compilation & Bundling | `npm run build` | Vite client bundle + esbuild `dist/server.cjs` emit successfully | Block PR Merge |
| **GATE-05** | Local Secret Scan | `.\scripts\qa\security\scan-local-secrets.ps1` | 0 detected high-entropy keys, Stripe live keys, JWT secrets, or DB passwords | Block PR Merge |
| **GATE-06** | Core Regression Contracts | `.\scripts\qa\regression\validate-regression-core.ps1` | All contract regression assertions pass without drift | Block PR Merge |
| **GATE-07** | Security Baseline Audit | `.\scripts\qa\security\validate-security-baseline.ps1 -Mode Report` | Execution successful; outputs comprehensive security posture report | Block PR Merge |
| **GATE-08** | E2E Browser Suite | `npm run test:e2e` (`playwright test`) | 100% test pass on Chromium; all core flows green | Block PR Merge |

---

## 4. Local Quality Commands & Developer Workflow

Developers must validate code locally prior to opening or updating a Pull Request.

### 4.1 Fast Local Gate (`npm run qa:fast`)
Executes the rapid inner-loop validation in < 30 seconds:
```powershell
.\scripts\qa\validate-fast.ps1
```
- Runs: TypeScript compilation (`tsc --noEmit`), Unit test suite (`npm test`), Production build (`npm run build`).

### 4.2 Comprehensive Release Gate (`npm run qa:release`)
Executes the full local validation suite prior to PR submission:
```powershell
.\scripts\qa\validate-release.ps1
```
- Runs: Fast Gate + Local Secret Scanner + Core Regression Suite + Security Baseline Audit.

---

## 5. Pull Request Merge Criteria

To merge any PR into `main` or release candidate branches, the following conditions are strictly required:

1. **Required Status Checks**:
   - `quality`: PASS (GitHub Actions)
   - `e2e`: PASS (GitHub Actions)
   - `aggregate`: PASS (GitHub Actions)
2. **Review Approvals**:
   - Minimum of one (1) approving review from a designated code owner / senior engineer.
   - All conversation threads and review comments must be resolved.
3. **Branch Hygiene**:
   - Branch must be rebased or cleanly merged against the tip of `main`.
   - Linear Git history preferred (Squash and Merge or Rebase).
4. **Commit Message Standard**:
   Must follow Conventional Commits:
   - `feat(scope): ...`
   - `fix(scope): ...`
   - `docs(scope): ...`
   - `test(scope): ...`
   - `refactor(scope): ...`
   - `chore(scope): ...`

---

## 6. Prohibition on Bypassing or Weakening Controls

> [!CAUTION]
> The following actions constitute severe governance violations:
> - Adding `// @ts-ignore` or `// @ts-nocheck` to bypass type errors.
> - Casting types to `any` or `unknown as any` to bypass type checking.
> - Renaming tests to `it.skip` or `describe.skip` to hide failing assertions.
> - Commenting out test suites in `quality-gate.yml`.
> - Weakening secret scanner regex patterns to ignore committed test secrets.
> - Pushing with `git push --no-verify` or force-merging as repository administrator without QA Lead approval.

Any PR exhibiting these patterns must be rejected immediately during code review.
