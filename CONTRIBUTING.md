# Contributing to Client Commerce Platform / Selfcare Sinners

Welcome to the Client Commerce Platform engineering repository. All contributors, human engineers, and autonomous agents must strictly adhere to this engineering governance lifecycle to ensure code quality, security invariance, and reliable deployments.

---

## 1. The Canonical 19-Stage Engineering Lifecycle

Engineering execution follows the canonical 19-stage lifecycle defined in `docs/engineering/TEAM_DEVELOPMENT_WORKFLOW.md` (`GOV-ENG-001`). No stage may be bypassed. Progression requires satisfying explicit entry and exit criteria.

```
Product Direction (01)
  ↓
Requirements Ready (02)
  ↓
Design Ready (03)
  ↓
Contract Freeze (04)
  ↓
Development Ready (05)
  ↓
Ready (06)
  ↓
In Progress (07)
  ↓
Feature Branch (08)
  ↓
Implementation + Local Validation (09)
  ↓
Pull Request (10)
  ↓
CI Hard Gates (11)
  ↓
Peer Review (12)
  ↓
QA Verification (13)
  ↓
Staging Validation (14)
  ↓
Release Gate (15)
  ↓
Merge & Deployment (16)
  ↓
Production Smoke (17)
  ↓
Observability & Monitoring (18)
  ↓
Incident / Feedback → Backlog (19)
```

### Stage Summary & Responsibilities

| Stage # | Stage Name | Entry Criteria | Exit Criteria / Deliverable | Responsible Party |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Product Direction** | Commercial requirement, client request, or strategic initiative identified. | Documented problem statement, business objective, and value proposition. | Product Owner / Stakeholder |
| **02** | **Requirements Ready** | High-level direction approved; Jira parent initiative or epic created. | Acceptance criteria drafted, non-functional requirements specified, user stories mapped. | Product Owner + Domain Lead |
| **03** | **Design Ready** | Functional requirements clarified; UI/UX or architectural patterns established. | UI/UX mockups frozen (if frontend) or architectural data flow diagram prepared (if backend). | UI/UX Designer / Architect |
| **04** | **Contract Freeze** | Technical design reviewed across boundaries. | TypeScript interfaces, database schema DDL/RPC signatures, and API payload contracts signed off (`DR-*`). Classified as `FROZEN CONTRACT`. | Technical Authority + Domain Owners |
| **05** | **Development Ready** | Contract frozen; Jira ticket meets 100% of Definition of Ready (DoR). | `ENGINEER_READY_CHECKLIST.md` passed; ticket specification fully written. | Domain Lead / Architect |
| **06** | **Ready** | Ticket prioritized in current sprint backlog. | Assigned to an active sprint column; unblocked by upstream work. | Scrum Lead / Domain Lead |
| **07** | **In Progress** | Engineer pulls ticket within strict WIP limit allocation. | Jira ticket transitioned to `In Progress`; branch created off latest `origin/main`. | Assigned Engineer |
| **08** | **Feature Branch** | Branch created using canonical naming conventions. | Working branch clean, isolated, tracking `origin/main`. | Assigned Engineer |
| **09** | **Implementation + Local Validation** | Branch ready; development underway according to frozen contracts. | Code written, unit tests added, local lint/build/qa scripts passing cleanly with exit code 0. | Assigned Engineer |
| **10** | **Pull Request** | Local validation passes with zero errors/warnings. | PR opened targeting `main` with standard PR template, evidence attached, Jira linked. | Assigned Engineer |
| **11** | **CI Hard Gates** | PR submitted or updated. | All GitHub Actions quality gate checks pass (lint, unit tests, build, security, regression, E2E). | Automated CI Runner |
| **12** | **Peer Review** | CI Hard Gates reporting green. | Minimum 1 explicit domain codeowner approval per `.github/CODEOWNERS`; all review threads resolved. | Codeowners |
| **13** | **QA Verification** | Code review approved; QA verification environment or suite triggered. | Automated QA suites and exploratory QA verification signed off with evidence. | QA Lead / Domain Lead |
| **14** | **Staging Validation** | QA verified; deployment to staging/preview environment. | Staging database migrations applied cleanly; runtime verification completed. | Release Engineer / Domain Lead |
| **15** | **Release Gate** | Staging validation successful; deployment package prepared. | Release checklist signed off; rollback plan confirmed; release notes staged. | Release Authority (`@risejoaquin`) |
| **16** | **Merge & Deployment** | Release gate unlocked. | PR merged via Squash & Merge; Railway automated production build triggered. | Release Authority (`@risejoaquin`) |
| **17** | **Production Smoke** | Production deployment completed on Railway. | Automated and manual production smoke tests (`validate-production.ps1`) executed and passed. | Release Authority / On-Call |
| **18** | **Observability** | Production smoke passed; traffic flowing. | Sentry error rates normal, Pino log streams clean, latency within SLA thresholds. | Engineering Team |
| **19** | **Feedback / Backlog** | System operational; telemetry or user feedback collected. | Defect tickets created or enhancement requests fed into Stage 01. | Product / Engineering |

---

## 2. Jira Ticket Intake & Allocation (`CCP-XX`)

1. **Jira Issue Reference**: Every single code or documentation change must originate from an assigned Jira ticket in `solidbit.atlassian.net` under the `CCP` project (e.g., `CCP-14`, `CCP-39`, `CCP-40`, `CCP-43`).
2. **Definition of Ready (DoR)**: Do not begin implementation until the ticket satisfies the DoR:
   - Clear objective and explicit "out of scope" boundaries;
   - Technical contract reference (`DR-*`) and version specified;
   - Concrete, testable acceptance criteria;
   - Upstream blockers identified and resolved.

---

## 3. Work-In-Progress (WIP) Limits & Worktree Isolation

### Strict Concurrency Limit
To prevent cognitive fragmentation and integration collisions, all contributors (human or autonomous agents) operate under strict WIP limits:
$$\text{Max WIP} = 1 \text{ Primary Active Ticket} + 1 \text{ Secondary / Non-Blocking Ticket}$$

- **Primary Active Ticket**: Hands on keyboard, active implementation in local branch.
- **Secondary Ticket (Non-Blocking)**: Awaiting CI results, awaiting peer review, or conducting preliminary research. Zero active code churn.
- **Prohibition**: Never implement two active branches concurrently.

### Git Worktree Isolation
All active work must be executed in dedicated, isolated Git worktrees (e.g., `worktrees/ccp-XX-...`). Never share working trees between concurrent tickets or agents.

---

## 4. Branching Strategy & Hygiene

### Branch Naming Conventions
All branches must branch off the latest `origin/main` (or an explicit release candidate branch during hardening) and use canonical naming:

```
<category>/<jira-key>-<short-descriptive-slug>
```

#### Allowed Categories:
- `feat/`: New user-facing or platform functionality (e.g., `feat/ccp-14-pos-sales-api`)
- `fix/`: Defect remediation or bug patch (e.g., `fix/ccp-18-upload-auth`)
- `docs/`: Documentation, specifications, governance (e.g., `docs/ccp-40-antigravity-governance`)
- `chore/`: Tooling, workflow updates, non-code dependencies (e.g., `chore/ccp-52-vitest-upgrade`)
- `refactor/`: Code restructuring without behavioral change (e.g., `refactor/ccp-89-pino-logger-extract`)
- `test/`: Automated test suite additions or harness updates (e.g., `test/ccp-67-order-idempotency-e2e`)

### Prohibitions:
- **Direct Pushes to `main` are Strictly Prohibited**: All changes land via Pull Requests.
- **No Untracked Branches**: Generic names like `test`, `dev`, `my-feature`, or `temp` are rejected.
- **No Force Pushes on Shared Branches**: `git push --force` and `git reset --hard` on `main` or shared collaboration branches are strictly forbidden.

---

## 5. Implementation Standards & Contract Invariance

1. **Architecture Stack**: Monolith React 19 frontend + Node.js 22 Express backend + PostgreSQL / Supabase with Row Level Security (RLS).
2. **Frozen Contracts Are Immutable**: Interfaces and DTOs in `src/types/`, database schemas in `supabase/`, and contracts in `docs/engineering/client-01/` (`DR-*`) are frozen. Unilateral modifications during implementation are strictly forbidden. If an issue is discovered, halt implementation and follow `docs/engineering/CHANGE_CONTROL.md`.
3. **Preserve Comments & Docstrings**: Maintain existing inline documentation unless intentionally refactoring the affected code.

---

## 6. Mandatory Local Testing Suites

Before opening or updating a Pull Request, execute the local validation suite using **only canonical npm scripts**. All commands must exit with **exit code 0**:

### 6.1 Fast Pre-Gate (Required for Every PR)
```powershell
# 1. Typecheck: Verify strict TypeScript compilation without emission
npm run lint

# 2. Unit & Integration Suite: Run Vitest test suite
npm test

# 3. Production Build: Bundle client (Vite) and server (esbuild)
npm run build

# 4. Fast Quality Pre-Gate: Automated local PowerShell quality check
npm run qa:fast
```

### 6.2 Extended & Release Validation (Required for DB, Security, Core Flows, or Release Candidates)
```powershell
# Full release validation suite (includes security baseline & regression checks)
npm run qa:release

# Automated local secret scanner
.\scripts\qa\security\scan-local-secrets.ps1

# Security baseline audit report
.\scripts\qa\security\validate-security-baseline.ps1

# Core regression contracts harness
.\scripts\qa\regression\validate-regression-core.ps1

# Playwright End-to-End customer journey testing
npm run test:e2e
```

---

## 7. Pull Request Standards & Creation

1. Target `main` (or designated RC branch).
2. Fill out `.github/PULL_REQUEST_TEMPLATE.md` completely:
   - Reference the Jira ticket: `[CCP-XX](https://solidbit.atlassian.net/browse/CCP-XX)`;
   - Architectural classification: `CURRENT`, `PLANNED`, or `FUTURE`;
   - Local validation checklist with explicit exit codes;
   - Security and data minimization declarations;
   - Rollback and deployment verification plan.
3. If the PR is incomplete, in progress, or intended for governance inspection, open it as a **Draft Pull Request**.

---

## 8. Automated CI Quality Gate

Every Pull Request triggers the GitHub Actions workflow (`.github/workflows/quality-gate.yml`), executing:
- Node 22 setup & `npm ci`
- `npm run lint` (Strict TypeScript compilation)
- `npm test` (Vitest unit & integration tests)
- `npm run build` (Vite client + esbuild server bundles)
- Secret Scanning (`scripts/qa/security/scan-local-secrets.ps1`)
- Core Regression Contracts (`scripts/qa/regression/validate-regression-core.ps1`)
- Security Baseline Report (`scripts/qa/security/validate-security-baseline.ps1`)
- Playwright E2E Suite (`npm run test:e2e`)

All CI jobs (`quality`, `e2e`, `aggregate`) must report `success` before a PR is eligible for peer review sign-off.

---

## 9. Domain Codeownership & Review Requirements

Code reviews are governed strictly by `.github/CODEOWNERS`:

### Subsystem Owners:
- **Backend / Database / APIs / Inventory / Orders**: Rogelio Beltran Valenzuela (`@bonjourrog`)
- **Frontend / Storefront UI / Admin UI / Web POS UI**: Julian Alejandro Rodriguez Verdugo (`@Julian716`)
- **Architecture / Security / CI/CD / Release Engineering / Governance**: Joaquin (`@risejoaquin`)

### Mandatory Approval Thresholds:
- **Single-Domain PRs**: Minimum **1 explicit domain codeowner approval**.
- **Cross-Domain PRs (`src/types/`, `src/lib/`, root config)**: Minimum **2 approvals**, including Technical Authority (`@risejoaquin`).
- **Zero Unresolved Comments**: All review conversations must be marked resolved before merge.

---

## 10. Governance & Branch Protection Verification Notice

> **IMPORTANT NOTICE ON BRANCH PROTECTION & ENFORCEMENT**:
> - While branch protection, required status checks, and CODEOWNERS reviews are mandatory engineering policies defined in repository documentation, **no contributor or autonomous agent may assert that branch protection is actively enforced by GitHub without verified read confirmation of repository rulesets and settings**.
> - Live audits have demonstrated that API integrations may encounter `403 Resource not accessible by integration` when inspecting collaborator permissions or creating Git references. Consequently, the actual enforcement state of GitHub branch protection must be verified administratively by repository owners.
> - Direct pushes to `main` remain **strictly prohibited by policy** at all times, regardless of platform-level enforcement mechanisms.

---

## 11. Multi-Level Gate Evidence Separation

To avoid false confidence, the team maintains strict distinction between verification levels:

- **`LOCAL PASS`**: Verification scripts executed locally on the developer machine / worktree exit with code 0.
- **`PR CI PASS`**: Automated GitHub Actions quality gate workflow completes with `success`.
- **`QA PASS`**: Automated and exploratory test criteria validated by QA Lead.
- **`STAGING PASS`**: Staging deployment and database migrations verified in the staging environment.
- **`PROD PASS`**: Production health endpoint (`/api/health`), production smoke (`validate-production.ps1`), and production smoke workflow (`production-smoke.yml`) report success.

> **RULE**: None of these passes automatically implies or substitutes for another. Never declare a task complete on production based solely on a local test pass.

---

## 12. Merge & Production Verification

1. Merges to `main` are performed exclusively by the Release Authority (`@risejoaquin`) once all CI checks pass and required approvals are secured.
2. Following merge, Railway triggers automated production deployment of `main` to `https://selfcaresinners.com`.
3. Post-merge verification protocol:
   - Confirm `https://selfcaresinners.com/api/health` reports status `ok` with the merged commit SHA.
   - Run production smoke validation:
     ```powershell
     .\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "<MERGED_COMMIT_SHA>"
     ```
   - Confirm that `.github/workflows/production-smoke.yml` completes successfully.
