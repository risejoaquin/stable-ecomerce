# Team Development Workflow & Lifecycle Governance

**Document ID**: `GOV-ENG-001`  
**Classification**: Authoritative Engineering Governance  
**Status**: ACTIVE / ENFORCED  
**Applies To**: All human engineers, autonomous agents, technical leads, and release authorities  
**Authority**: Technical & Release Authority (`@risejoaquin`)  

---

## 1. Executive Summary & Foundational Principles

This document establishes the canonical development lifecycle, gating mechanisms, branch hygiene, and work-in-progress rules for the **Client Commerce Platform (Selfcare Sinners)**.

### The Foundational Axiom
> **PROMPTS ARE EPHEMERAL. REPOSITORY STATE, DOCUMENTATION, AND CI EVIDENCE ARE AUTHORITATIVE.**

In a hybrid engineering environment comprising human engineers and autonomous agentic contributors, ad-hoc chat sessions, transient prompt instructions, and ephemeral memory are **never** authoritative records of system state, design intent, or completion status. 

Every architectural contract, technical specification, and status transition must be explicitly persisted within the repository, Jira, or CI build artifacts.

---

## 2. End-to-End Engineering Lifecycle Gates

The engineering lifecycle transitions through 19 discrete, strictly monitored stages. No stage may be skipped. Progressing from one stage to the next requires explicit satisfying of entry and exit criteria.

```
Product Direction (1)
  ↓
Requirements Ready (2)
  ↓
Design Ready (3)
  ↓
Contract Freeze (4)
  ↓
Development Ready (5)
  ↓
Ready (6)
  ↓
In Progress (7)
  ↓
Feature Branch (8)
  ↓
Implementation + Local Validation (9)
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

### Stage Transition Matrix

| Stage # | Stage Name | Entry Criteria | Exit Criteria / Deliverable | Responsible Party |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Product Direction** | Commercial requirement, client request, or strategic initiative identified. | Documented problem statement, business objective, and value proposition. | Product Owner / Stakeholder |
| **02** | **Requirements Ready** | High-level direction approved; Jira parent initiative or epic created. | Acceptance criteria drafted, non-functional requirements specified, user stories mapped. | Product Owner + Domain Lead |
| **03** | **Design Ready** | Functional requirements clarified; UI/UX or architectural patterns established. | UI/UX mockups frozen (if frontend) or architectural data flow diagram prepared (if backend). | UIX Designer / Architect |
| **04** | **Contract Freeze** | Technical design reviewed across boundaries. | TypeScript interfaces, database schema DDL/RPC signatures, and API payload contracts signed off. Classified as `FROZEN CONTRACT`. | Technical Authority + Domain Owners |
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

## 3. Work-In-Progress (WIP) Strict Limits

To prevent cognitive fragmentation, uncoordinated code churn, and integration deadlocks, the engineering organization strictly enforces Work-In-Progress limits.

### The WIP Allocation Rule
Every engineer (human or autonomous agent) is bound to:
$$\text{Max WIP} = 1 \text{ Primary Active Ticket} + 1 \text{ Secondary / Non-Blocking Ticket}$$

```
┌────────────────────────────────────────────────────────────────────────┐
│ ENGINEER CONCURRENCY LIMITS                                            │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1 PRIMARY ACTIVE TICKET          │ 1 SECONDARY TICKET (NON-BLOCKING)   │
│ - Hands on keyboard / active dev │ - Awaiting CI run or Peer Review    │
│ - Local branch implementation    │ - Refining requirements / research  │
│ - Writing tests and code edits   │ - Zero active branch code churn     │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### WIP Enforcement Rules:
1. **No Concurrent Implementation**: An engineer may never have two branches actively in local code implementation simultaneously.
2. **Context Switching Guard**: A secondary ticket may only be touched when the primary ticket is asynchronously blocked (e.g., waiting for codeowner review, running long staging tests, or blocked on upstream dependency).
3. **Queue Eviction**: If a third ticket is assigned or requested, it must remain in `Ready` or `Backlog` until one of the two active slots transitions to `Merged` or is officially marked `BLOCKED` with an escalated impediment.

---

## 4. Branching & PR Lifecycle Standard

### 4.1 Branch Naming Conventions
All branches must branch off the current `main` branch (after pulling latest `origin/main`) and follow this exact naming structure:

```
<category>/<jira-key>-<short-descriptive-slug>
```

#### Allowed Categories:
- `feat/`: New user-facing or platform functionality (e.g., `feat/ccp-101-web-pos-register`)
- `fix/`: Bug remediation or patch (e.g., `fix/ccp-108-stock-decrement-race`)
- `docs/`: Documentation, specifications, ADRs, governance (e.g., `docs/ccp-44-engineering-governance`)
- `chore/`: Tooling, workflow updates, non-code dependencies (e.g., `chore/ccp-52-vitest-upgrade`)
- `refactor/`: Internal code restructuring without behavioral change (e.g., `refactor/ccp-89-pino-logger-extract`)
- `test/`: Automated test suite additions or harness updates (e.g., `test/ccp-67-order-idempotency-e2e`)

#### Prohibited Branch Practices:
- **No direct commits to `main`**: Main is protected; direct pushes are prohibited.
- **No untracked ticket branches**: Branches like `test-fix`, `dev`, `my-feature`, or `temp` are rejected.
- **No long-lived feature branches**: Branches older than 5 business days without rebase must be evaluated for decomposition.

### 4.2 Pull Request Standards
Every Pull Request must be created using the repository PR template (`.github/PULL_REQUEST_TEMPLATE.md`) and must contain:

1. **Jira Reference**: Explicit link and issue key in title and description (e.g., `[CCP-44]`).
2. **Architecture Classification**: Explicitly categorized under `CURRENT`, `PLANNED`, or `FUTURE` architecture.
3. **Summary of Changes**: Concise, non-obvious description of what changed and architectural rationale.
4. **Contract Impact**: Statement of whether any public API, database schema, or shared TypeScript contract was modified.
5. **Local Validation Evidence**: Complete checklist with exit codes of:
   - `npm run lint` (TypeScript typecheck)
   - `npm test` (Unit/integration test suite)
   - `npm run build` (Client Vite + Server esbuild bundle)
   - `npm run qa:fast` (Fast gate script)
6. **Risk Analysis & Rollback Plan**: Identified failure modes and actionable rollback steps.

### 4.3 Commit Hygiene
- **Conventional Commits**: Format commit messages as `<type>(<scope>): <imperative description>`:
  - Example: `feat(pos): implement cash payment drawer toggle`
  - Example: `fix(auth): verify resend webhook signature using svix`
- **Atomic Commits**: Each commit must represent a single logical, buildable change. Broken intermediate commits that fail compilation are prohibited.
- **No Sensitive or Transient Data**: Never commit `.env`, `.env.local`, logs, test outputs, credentials, or generated QA run artifacts.
- **No History Rewrites on Shared Branches**: Never run `git push --force` or `git reset --hard` on `main` or shared collaboration branches.

---

## 5. Peer Review & Domain Codeowner Governance

Code reviews are governed by path ownership defined in `.github/CODEOWNERS`.

### Domain Codeownership Matrix:
- **Backend, Database, APIs, & Integrations**: Rogelio Beltran Valenzuela (`@bonjourrog`)
- **Frontend, UI, Admin, & Web POS UI**: Julian Alejandro Rodriguez Verdugo (`@Julian716`)
- **Architecture, Security, CI/CD, & Release Engineering**: Joaquin (`@risejoaquin`)

### Mandatory Approval Thresholds:
1. **Single-Domain PRs**: Must receive at least **1 formal approval** from the designated domain owner.
2. **Cross-Cutting PRs**: Any PR modifying `/src/types/`, `/src/lib/`, `/supabase/migrations/`, or root configuration files requires **at least 2 approvals**, including the Technical Authority (`@risejoaquin`).
3. **Zero Unaddressed Comments**: All review discussions must be resolved before merge. Neither author nor reviewer may resolve a conversation without consensus or evidence.

---

## 6. CI Hard Gates & Escalation Protocol

### 6.1 The CI Hard Gate Requirement
Continuous Integration workflows are automated execution gates enforcing quality invariants. Every pull request must pass the full suite defined in `.github/workflows/quality-gate.yml`:

```
┌────────────────────────────────────────────────────────────────────────┐
│ CI HARD GATES (All Must Pass)                                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. TypeScript Strict Typecheck (`npm run lint`)                        │
│ 2. Unit & Integration Suite (`npm test`)                               │
│ 3. Full Production Bundle Build (`npm run build`)                      │
│ 4. Secret Scanner (`scripts/qa/security/scan-local-secrets.ps1`)       │
│ 5. Security Baseline Verification (`validate-security-baseline.ps1`)    │
│ 6. Core Regression Contracts (`validate-regression-core.ps1`)          │
│ 7. Playwright End-to-End Suite (`npm run test:e2e`)                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 CI Failure Escalation Protocol
If any CI gate fails:
1. **Immediate Stop**: The PR author must halt forward progression. Do not request reviews while CI is red.
2. **Reproduce Locally**: Run the failing step locally using the exact repository script.
3. **Prohibition Against Weakening Controls**:
   - **STRICTLY PROHIBITED**: Disabling tests, commenting out assertions, inserting `@ts-ignore`, suppressing ESLint/TypeScript errors, or increasing timeouts to bypass CI failures.
4. **Flake / Environment Investigation**:
   - If a failure is determined to be an environmental or runner issue (and not code regression), document the exact failure output and escalate to the Technical Authority (`@risejoaquin`).
   - Only the Technical Authority may authorize a workflow re-run without code changes.

---

## 7. Change Control & Audit Trail

All governance processes defined in this document are subject to immutable audit trails. Any modifications to this workflow document must be proposed via an Architecture Decision Record (ADR) and approved by the Technical Authority.
