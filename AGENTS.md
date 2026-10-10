# AGENTS.md
# SolidBit / Stable-Ecommerce — Client Commerce Platform (Client 01: Selfcare Sinners)

## 1. Purpose & Authority

This repository is developed through structured human-agent collaboration adhering to canonical engineering governance:

- **Technical & Release Authority — Joaquín (`@risejoaquin`)**: Final authority for product direction, architecture, security policies, permissions, credentials, ADR approvals, release gates, and all production merges and deployments. Autonomous agents and technical assistants do NOT possess authority to approve PRs, merge to `main`, or deploy software.
- **Backend Engineer (Engineer A) — Rogelio Beltran Valenzuela (`@bonjourrog`)**: Domain owner for Backend Application, PostgreSQL / Supabase Database, Row Level Security (RLS) policies, database migrations, SellableUnit domain foundation, inventory concurrency, atomic stock decrement RPCs, orders, and REST/RPC APIs.
- **Frontend Engineer (Engineer B) — Julian Alejandro Rodriguez Verdugo (`@Julian716`)**: Domain owner for Storefront Customer UI, Admin Command Center Backoffice UI, Web POS Register UI, responsive themes, client styling, and Playwright end-to-end customer journey testing.
- **Primary Local Execution Agent — Antigravity CLI**: Local executor and orchestrator operating within isolated Git worktrees. Antigravity executes file inspections, test suites, builds, local validation scripts, atomic edits, and evidence collection under strict human authorization and least-privilege boundaries.
- **Technical Analysis & Planning Support — ChatGPT**: Support agent for technical reasoning, architecture analysis, planning, code review assistance, remediation design, and evidence formatting. ChatGPT operates via external interfaces, does NOT have direct access to local execution terminals, and does NOT execute local commands or manage local Git repositories.

---

## 2. Foundational Axiom & Operational Invariants

### The Foundational Axiom
> **PROMPTS ARE EPHEMERAL. REPOSITORY STATE, JIRA TICKETS, FROZEN CONTRACTS, AND CI EVIDENCE ARE AUTHORITATIVE.**

Instructions in chat sessions, transient conversation memory, or ad-hoc prompts never supersede frozen contracts (`DR-*`), repository code, Git commit history, Jira issue specifications, or automated CI test results.

### Core Execution Invariants
1. **Smallest Correct Change**: Implement the minimal correct modification required to satisfy the acceptance criteria. Opportunistic refactoring, aesthetic rewrites, and unrequested scope expansions are strictly forbidden.
2. **Work-In-Progress (WIP) Strict Limit**:
   $$\text{Max WIP} = 1 \text{ Primary Active Ticket} + 1 \text{ Secondary / Non-Blocking Ticket}$$
   - **Primary Active Ticket**: Hands on keyboard, local branch implementation, writing code and tests.
   - **Secondary Ticket (Non-Blocking)**: Awaiting CI execution, awaiting peer review, or conducting initial requirements research. Zero active code churn.
   - **No Concurrent Implementation**: An engineer or agent may never implement two feature branches simultaneously.
3. **Worktree Isolation**: All development must occur in isolated Git worktrees (e.g., `worktrees/ccp-XX-...`). Agents must keep a clean workspace and never create, modify, or delete sibling worktrees.
4. **No Direct Development on `main`**:
   - `git push origin main` is **strictly prohibited**.
   - `git push --force` or `git reset --hard` on shared branches is **strictly prohibited**.
   - All changes must be delivered via isolated branches (`<category>/<jira-key>-<short-descriptive-slug>`), Pull Requests targeting `main` (or an explicit release candidate branch), automated CI quality gates, domain codeowner approvals, QA verification, staging validation, and authorized release merge.

---

## 3. Autonomous Agent Prohibitions & Boundaries

Autonomous agents (including Antigravity CLI and paired LLMs) operate strictly as subordinate execution units governed by human authorities:

1. **NO Autonomous Self-Sign-Off**: An agent may never approve its own Pull Request, sign off on an ADR, or declare a release gate passed.
2. **NO Direct Merges**: Agents are strictly prohibited from executing `git merge`, calling GitHub merge APIs, or triggering automated production deployments (Railway, Supabase, Vercel).
3. **NO Jira Status Manipulation**: Agents must not unilaterally transition Jira tickets to `Done` or `Closed` without verified CI evidence, codeowner approval, and human sign-off.
4. **NO Weakening of Quality Controls**:
   - **PROHIBITED**: Inserting `// @ts-ignore`, `// @ts-nocheck`, or `eslint-disable` to silence compiler or lint errors.
   - **PROHIBITED**: Deleting failing test assertions or deleting existing test suites.
   - **PROHIBITED**: Artificially increasing test timeout thresholds to mask performance regressions.
   - **PROHIBITED**: Mocking out security or authorization checks (e.g., bypassing Supabase RLS, skipping webhook HMAC validation) to achieve a green test pass.
5. **NO Production Database Mutations**: Agents must never execute ad-hoc DDL or DML against production databases.

---

## 4. Division of Responsibilities

### Technical Authority (`@risejoaquin`) Owns:
- Architectural and security decisions;
- Acceptance of Definition of Ready (DoR) and Definition of Done (DoD);
- ADR approvals and frozen contract changes (`DR-*`);
- Release scheduling, feature freeze, hardening, and release candidate cut;
- Pull Request approvals for architecture, security, and governance paths;
- Final merge authorization to `main` and production release deployments.

### Domain Engineers (`@bonjourrog`, `@Julian716`) Own:
- Domain technical design and module implementation within assigned subsystems;
- Code reviews and sign-offs as designated domain codeowners;
- Unit, integration, and domain-specific regression test implementation;
- Staging validation of domain features.

### Antigravity CLI Owns:
- Inspecting local repository state and branch tracking;
- Executing local commands (PowerShell, npm, Node, Vitest, Playwright);
- Running local quality gates (`npm run lint`, `npm test`, `npm run build`, `npm run qa:fast`);
- Applying atomic code edits strictly within allowed file paths;
- Capturing stdout, stderr, and command exit codes;
- Formatting and generating local evidence artifacts;
- Halting execution immediately upon encountering non-trivial failures.

### ChatGPT Support Owns:
- Reviewing diagnostic evidence and proposing root-cause hypotheses;
- Designing remediation plans adhering to existing contracts;
- Assisting in requirements breakdown and test case structuring;
- Assisting with documentation, auditing, and report consolidation.

---

## 5. Git Lifecycle & Branching Standards

### Branch Naming Convention
All branches must branch off the latest `origin/main` commit and follow canonical naming:
```
<category>/<jira-key>-<short-descriptive-slug>
```
Categories:
- `feat/`: New user-facing or platform functionality (e.g., `feat/ccp-14-pos-sales-api`)
- `fix/`: Defect remediation or bug patch (e.g., `fix/ccp-18-upload-auth`)
- `docs/`: Documentation, specifications, governance (e.g., `docs/ccp-40-antigravity-governance`)
- `chore/`: Tooling, workflow updates, non-code dependencies (e.g., `chore/ccp-52-vitest-upgrade`)
- `refactor/`: Code restructuring without behavioral change (e.g., `refactor/ccp-89-pino-logger-extract`)
- `test/`: Automated test suite additions or test harness updates (e.g., `test/ccp-67-order-idempotency-e2e`)

### Git Staging & Commit Hygiene
- **Never use broad staging commands**:
  - Do NOT run `git add .` or `git add -A`.
  - Always stage exact files: `git add path/to/file1 path/to/file2`.
- **Pre-commit verification**:
  ```powershell
  git status --short
  git diff --check
  git diff --stat
  git diff --cached --name-only
  ```
- **Commit format**: Conventional commits: `<type>(<scope>): <imperative description> [CCP-XX]`.
- **Atomic Commits**: Every commit must be compilable, testable, and logically cohesive.

---

## 6. Communication & Reporting Protocol

When reporting execution results, the agent must output:
1. Exact commands executed;
2. Command exit codes (0 = SUCCESS, non-zero = FAILURE);
3. PASS / FAIL status for each discrete step;
4. Relevant stdout/stderr (retaining full error traces, line numbers, and failure summaries);
5. List of files modified;
6. `git status --short` output;
7. `git diff --stat` output;
8. Exact error messages without summarizing away diagnostic context.

---

## 7. Failure Protocol

If any test, build, lint, or validation script fails:
1. **STOP IMMEDIATELY**: Halt the current execution sequence.
2. **DO NOT PUSH OR MERGE**: Never push failed code or mark tasks ready for review.
3. **DO NOT INVENT WORKAROUNDS**: Do not weaken assertions, skip tests, or alter interfaces to force a green run.
4. **CAPTURE EVIDENCE**: Log the full error, command, and surrounding context.
5. **ESCALATE**: Escalate to Technical Authority (`@risejoaquin`) or assigned domain lead with a clear diagnostic summary.

> **RULE ON PASS STATUS**: Never declare `PASS` because "most tests passed" or "only non-critical checks failed". `PASS` requires 100% of required gates for the task to exit cleanly with code 0.

---

## 8. Preserved Technical & Security Safeguards

### 8.1 Zero Secret Exposure
Never commit, log, or serialize:
- API secrets, private keys, or database credentials;
- Stripe live or test secret keys, webhook signing secrets;
- Resend email API keys, JWT signing secrets;
- Passwords or `password_hash` fields;
- Full user session tokens;
- Payment card data: Primary Account Numbers (PAN), Card Verification Values (CVV).

### 8.2 Database Security & Invariance
- **Row Level Security (RLS)**: Must be enabled on all Supabase tables (`ENABLE ROW LEVEL SECURITY`).
- **SECURITY DEFINER**: Any Postgres function defined with `SECURITY DEFINER` must explicitly enforce `SET search_path = public` to prevent search-path injection.
- **Stock Decrement Concurrency**: Inventory adjustments must execute atomically via dedicated RPC (`decrement_stock`) to prevent race conditions and negative inventory.
- **No Unauthorized Production Changes**: Never modify production schemas or permissions without explicit authorization and an approved migration script.

### 8.3 Payment Safety (Stripe & POS)
- Strictly preserve webhook signature verification (HMAC via Svix / Stripe SDK).
- Maintain payment idempotency using unique idempotency keys (`DR-IDEM-001`).
- Target technical readiness for **PCI DSS 4.0.1 SAQ A / SAQ A-EP**. Never claim official PCI certification without a qualified assessor audit.

### 8.4 Content Security Policy (CSP) & Web Security
- Do not weaken CSP headers by injecting `unsafe-inline` or `unsafe-hashes` without explicit architectural approval.
- Enforce input validation using strict schemas (e.g., Zod) on all API endpoints.
- Enforce data minimization: never expose internal columns (`cost_price`, `stripe_customer_id`, `internal_notes`) on public endpoints (`/api/products`, `/api/orders/track`).

### 8.5 Dependency Management
- `npm` is the canonical package manager.
- Always use `npm ci` for clean, reproducible installations.
- Do NOT run `npm install` unless dependencies are deliberately being added or updated.
- Do NOT run `npm audit fix` or `npm audit fix --force` without explicit human authorization.

### 8.6 Temporary & Generated Files
Strictly respect `.gitignore`. Never commit:
- `.env`, `.env.local`, or local configuration overrides;
- Local log files (`*.log`), debug dumps, or ad-hoc scratch scripts;
- Generated QA artifacts, Playwright test traces/videos, or Lighthouse reports (unless explicitly staged as versioned evidence);
- `node_modules` or build output directories (`dist/`, `build/`).

---

## 9. Quality Assurance & Verification Gates

### 9.1 Local Validation Commands
```powershell
# 1. Typecheck: Verify strict TypeScript compilation without emitting output
npm run lint

# 2. Unit & Integration Suite: Run Vitest test suite
npm test

# 3. Production Build: Bundle client (Vite) and server (esbuild)
npm run build

# 4. Fast Quality Pre-Gate: Automated local pre-gate script
npm run qa:fast
```

### 9.2 Extended & Release Gates (Required for DB, Security, Core, and Release PRs)
```powershell
# Full release validation suite
npm run qa:release

# Automated secret scanner
.\scripts\qa\security\scan-local-secrets.ps1

# Security baseline verification report
.\scripts\qa\security\validate-security-baseline.ps1

# Core regression contracts harness
.\scripts\qa\regression\validate-regression-core.ps1

# Playwright End-to-End customer journey testing
npm run test:e2e
```

---

## 10. Execution Contract & Standard Output Schema

Every autonomous agent task execution must conclude with a standardized evidence block:

```text
AGENT_ID=<Agent identifier, e.g., AGENT-A>
JIRA_KEY=<Jira ticket reference, e.g., CCP-40>
STATUS=PASS|FAIL|BLOCKED
BASE_SHA=<Commit SHA at start of work>
HEAD_SHA=<Commit SHA after local commits>
BRANCH=<Working branch name>
WORKTREE_PATH=<Full path to isolated worktree>
FILES_CHANGED=<Comma-separated list of modified files>
COMMANDS_AND_EXIT_CODES=<Command: exit_code; ...>
LOCAL_TESTS=PASS|FAIL|NOT_RUN
CI_RUN_URL=<GitHub Actions run URL or NONE>
PR_URL=<Pull Request URL or NONE>
JIRA_EVIDENCE_URL=<Jira issue or comment URL or NONE>
UNRESOLVED_RISKS=<Identified residual risks or NONE>
NEXT_AUTHORIZED_STEP=<Next sequential action approved by governance>
```