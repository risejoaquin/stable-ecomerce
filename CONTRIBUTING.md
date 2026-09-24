# Contributing to Client Commerce Platform / Selfcare Sinners

Welcome to the engineering repository. All contributors and team members must adhere to this structured engineering lifecycle to ensure high code quality, security invariance, and reliable deployments.

---

## The 10-Step Engineering Lifecycle

```
[1. Jira Ticket] -> [2. Branch] -> [3. Implementation] -> [4. Local Tests] -> [5. Pull Request]
       |
       v
[6. CI Quality Gate] -> [7. Peer Review] -> [8. Staging Check] -> [9. Merge] -> [10. Prod Verification]
```

### 1. Jira Ticket Intake & Assignment
- Every code change—whether a feature, bug fix, refactor, or chore—must originate from an assigned Jira ticket in `solidbit.atlassian.net` under the active project backlog (e.g., `COMM-101`, `POS-102`, `SEC-005`).
- No pull request will be merged without an associated Jira issue reference.

### 2. Branching Strategy
- **No Direct Development on `main`**: Direct pushes to `main` are **prohibited by team development policy**. All changes must land via peer-reviewed Pull Requests.
- Branch off the latest `main` commit using structured naming conventions:
  - `feat/<jira-key>-short-description` (e.g., `feat/pos-101-cashier-sale`)
  - `fix/<jira-key>-short-description` (e.g., `fix/sec-002-upload-auth`)
  - `chore/<jira-key>-short-description` (e.g., `chore/rg-01-governance`)
  - `refactor/<jira-key>-short-description`

### 3. Implementation Standards
- Follow established architectural boundaries (monolith React 19 frontend + Node.js 22 Express backend).
- Preserve existing comments, docstrings, and type definitions unless directly refactoring them.
- Do not introduce new architectural paradigms (e.g., microservices, external queues, hardware drivers) without formal approval from the Technical Authority (`@risejoaquin`).

### 4. Mandatory Local Testing
Before opening or updating a Pull Request, run the local verification suite using **only existing npm scripts**:

```powershell
# 1. Typecheck: Verify TypeScript compilation without emitting output
npm run lint

# 2. Unit & Integration Tests: Run Vitest test suite
npm test

# 3. Production Build: Bundle client (Vite) and server (esbuild)
npm run build

# 4. Fast Quality Pre-Gate: Comprehensive local automated PowerShell check
npm run qa:fast
```

#### Extended Verification Suites (Required when modifying security, DB, or core flows):
```powershell
# Full release validation suite (includes security baseline & regression checks)
npm run qa:release

# End-to-end customer journey testing (requires local server running)
npm run test:e2e

# Targeted security baseline audit
npm run qa:security
```

### 5. Pull Request Creation
- Open a Pull Request targeting `main`.
- Fill out `.github/PULL_REQUEST_TEMPLATE.md` completely:
  - Reference the Jira ticket (`solidbit.atlassian.net`).
  - Classify the architecture layer (CURRENT, PLANNED, or FUTURE).
  - Check off all local verification commands executed.
  - Detail any manual verification performed.

### 6. Automated CI Quality Gate
Every PR triggers the GitHub Actions workflow (`.github/workflows/quality-gate.yml`):
- Node 22 setup & `npm ci`
- `npm run lint` (TypeScript compilation)
- `npm test` (Vitest unit tests)
- `npm run build` (Vite + esbuild bundles)
- Secret Scanning (`scripts/qa/security/scan-local-secrets.ps1`)
- Core Regression Contracts (`scripts/qa/regression/validate-regression-core.ps1`)
- Security Baseline Report (`scripts/qa/security/validate-security-baseline.ps1`)
- Playwright E2E Suite (`npm run test:e2e`)

All dimensions must report `PASS` before a PR is eligible for merge.

### 7. Peer Review & Codeowner Sign-Off
- Code reviews are assigned according to `.github/CODEOWNERS`:
  - **Backend / Database / Orders / API**: Review by Rogelio (`@bonjourrog`).
  - **Frontend / UI / Admin / Web POS UI**: Review by Julian (`@Julian716`).
  - **Architecture / Security / CI / Core**: Review by Joaquin (`@risejoaquin`).
- At least one codeowner review and explicit approval is required.

### 8. Staging Validation
- When applicable, validate changes against the staging environment or preview deployment to confirm database migrations and UI rendering match production expectations.

### 9. Merge to `main`
- Merges to `main` are performed via Squash & Merge or Rebase Merge by the designated Release Authority (`@risejoaquin`) once:
  - All CI jobs pass.
  - Required codeowner approvals are secured.
  - No merge conflicts exist.

### 10. Production Validation
- Following merge, Railway automatically triggers deployment of `main` to `https://selfcaresinners.com`.
- The responsible engineer must verify production deployment:
  1. Inspect `https://selfcaresinners.com/api/health` to confirm the deployed commit SHA matches `main`.
  2. Execute the production smoke validation script:
     ```powershell
     .\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "<MERGED_COMMIT_SHA>"
     ```
  3. Confirm that GitHub Actions workflow `.github/workflows/production-smoke.yml` completes successfully.
