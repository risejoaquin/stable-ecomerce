# Engineer Execution Standard (Human & Autonomous Agents)

**Document ID**: `GOV-ENG-002`  
**Classification**: Authoritative Engineering Governance  
**Status**: ACTIVE / ENFORCED  
**Applies To**: Human Software Engineers, Autonomous Coding Agents, Pair Programming Systems  
**Authority**: Technical & Release Authority (`@risejoaquin`)  

---

## 1. Purpose & Guiding Principles

This standard defines the operational and behavioral boundaries for any qualified engineer—whether human, autonomous AI agent, or paired system—operating within the **Client Commerce Platform (Selfcare Sinners)** codebase.

### Core Execution Invariants
1. **Prompts Are Ephemeral**: Instructions in chat prompts or conversation history are ephemeral and non-authoritative. The repository code, Git commit history, documentation, and automated CI test results constitute the sole sources of truth.
2. **Deterministic Reproducibility**: Every code change must compile, pass all quality gates locally, and be verifiable through deterministic automated tests.
3. **Smallest Correct Change**: Implement the minimal correct modification required to fulfill the acceptance criteria. Opportunistic refactoring, aesthetic rewrites, and unrequested scope expansions are strictly forbidden.

---

## 2. Decision Classification Framework

Every technical decision made during design or implementation belongs to one of four discrete authority classes. Engineers and autonomous agents must recognize and respect these boundaries.

```
┌────────────────────────────────────────────────────────────────────────┐
│ DECISION CLASSIFICATION TAXONOMY                                       │
├────────────────────────────────────────────────────────────────────────┤
│ CLASS 1: FROZEN REQUIREMENT                                            │
│ - Authority: Product Owner / Commercial Stakeholder                    │
│ - Definition: Business rules, regulatory mandates, product invariants. │
│ - Engineer Rule: IMMUTABLE. May not be altered or re-interpreted.       │
├────────────────────────────────────────────────────────────────────────┤
│ CLASS 2: FROZEN CONTRACT                                               │
│ - Authority: Technical Authority (@risejoaquin) + Domain Leads         │
│ - Definition: Database schemas, RPC signatures, REST DTO schemas,      │
│   cross-boundary TypeScript interfaces (src/types/), API routes.       │
│ - Engineer Rule: IMMUTABLE during implementation. Requires RFC/ADR.    │
├────────────────────────────────────────────────────────────────────────┤
│ CLASS 3: DERIVED ENGINEERING DESIGN                                    │
│ - Authority: Domain Engineer / Ticket Implementer                      │
│ - Definition: Internal module decomposition, helper utilities within   │
│   domain boundary, state management hook design, local caching logic.  │
│ - Engineer Rule: IMPLEMENTATION FREEDOM within domain boundary.         │
├────────────────────────────────────────────────────────────────────────┤
│ CLASS 4: ENGINEER IMPLEMENTATION CHOICE                                │
│ - Authority: Individual Contributor                                    │
│ - Definition: Local variable naming, internal loop constructs,         │
│   private helper functions, styling token applications.                │
│ - Engineer Rule: FULL LOCAL DISCRETION adhering to style guide.        │
└────────────────────────────────────────────────────────────────────────┘
```

### Strict Contract Invariance
- **No Overturning Contracts**: Under no circumstances may an engineer unilaterally alter a Class 1 (Frozen Requirement) or Class 2 (Frozen Contract) to fit an implementation convenience.
- **Contract Drift Prevention**: If an engineer discovers during implementation that a frozen contract is technically inadequate or contradictory, the engineer **MUST STOP** implementation, document the conflict, and escalate via the formal change control procedure defined in `docs/engineering/CHANGE_CONTROL.md`.

---

## 3. Mandatory Local Validation Suite

Before any Pull Request is opened or marked ready for review, the implementer must execute the canonical local validation commands. All commands must execute cleanly with **exit code 0**.

### 3.1 Standard Fast Gate (Every PR)
The standard pre-flight suite verifies syntax, types, existing unit tests, and production bundling:

```powershell
# 1. Typecheck: Verify strict TypeScript compilation without emission
npm run lint

# 2. Unit & Integration Suite: Run Vitest suite
npm test

# 3. Production Build: Bundle React frontend (Vite) and Node.js server (esbuild)
npm run build

# 4. Automated Fast Quality Gate
npm run qa:fast
```

### 3.2 Extended Gate (Database, Security, or Cross-Domain PRs)
Required when touching `/server.ts`, `/src/server/`, `/supabase/`, `/src/types/`, `/scripts/qa/`, or payment/auth logic:

```powershell
# Full release qualification gate
npm run qa:release

# Automated local secret scanner
.\scripts\qa\security\scan-local-secrets.ps1

# Security baseline audit report
.\scripts\qa\security\validate-security-baseline.ps1

# Core regression harness
.\scripts\qa\regression\validate-regression-core.ps1
```

### 3.3 Acceptance Criteria for Local Execution
- **Zero Errors**: Compilation, lint, or test failures of any degree result in an immediate `FAIL`.
- **Zero Warnings that Mask Correctness**: Warnings regarding dead code, deprecated methods with breaking behavioral changes, or type coercions must be resolved.
- **Clean Git State**: No uncommitted scratch files, temp artifacts, or modified configuration files.

---

## 4. Specific Rules for Autonomous Agents (Codex, Antigravity, LLMs)

Autonomous AI agents operate as specialized execution units under human governance. In addition to standard engineering rules, agents are bound by the following prohibitions:

### 4.1 Prohibition Against Agent Self-Authorization
- **NO Autonomous Self-Sign-Off**: An agent may not approve its own Pull Request, approve an ADR, or declare a release gate passed without human verification.
- **NO Direct Merges**: Agents are strictly prohibited from issuing `git merge`, merging PRs via the GitHub API, or deploying to production environments (Railway, Supabase, Vercel).
- **NO Jira Status Manipulation**: Agents must not unilaterally transition tickets to `Done` or `Closed` without verified CI evidence and codeowner review.

### 4.2 Prohibition Against Weakening Controls
An agent must **never** modify tests or quality controls to make a gate pass:
- **PROHIBITED**: Inserting `// @ts-ignore`, `// @ts-nocheck`, or `eslint-disable` to silence type/lint errors.
- **PROHIBITED**: Deleting failing test assertions or deleting existing test files.
- **PROHIBITED**: Artificially increasing test timeout values to mask performance regressions.
- **PROHIBITED**: Mocking out a security or authorization check (e.g. bypassing RLS, skipping webhook HMAC validation) to achieve a green test run.

### 4.3 Clean Workspace Hygiene
- Agents must operate strictly within their assigned Git worktree.
- Agents must not create, delete, or modify sibling worktrees.
- Agents must never run destructive Git commands:
  - `git reset --hard`
  - `git clean -fdx`
  - `git push --force`
  - `git checkout .` (without explicit human instruction)

---

## 5. Security & Privacy Invariants

Every code implementation must preserve the security baseline established in `SECURITY.md` and ongoing audit phases:

1. **Zero Secret Leakage**: Never expose, log, or commit API keys, database credentials, Stripe webhook secrets, Resend tokens, or JWT signing secrets.
2. **Universal Data Minimization (AUDIT-01A)**:
   - Public-facing endpoints must return explicitly projected DTOs.
   - Never use unbounded queries like `.select('*')` on public endpoints (`/api/products`, `/api/orders/track`).
   - Sensitive columns (`password_hash`, `cost_price`, `stripe_customer_id`, internal notes) must never be serialized to client payloads.
3. **Database Security & RLS**:
   - Every Supabase table must enforce Row Level Security (`ENABLE ROW LEVEL SECURITY`).
   - Functions running with `SECURITY DEFINER` must specify an explicit `SET search_path = public`.
4. **Input Validation**:
   - All external inputs (request parameters, query strings, headers, webhook payloads) must undergo runtime validation using strict schema validators (e.g., Zod) before processing.

---

## 6. Definition of Done (DoD) for Execution

A task is considered complete and eligible for review only when all of the following conditions are met:

- [ ] All specified acceptance criteria in the Jira ticket are implemented.
- [ ] No Class 1 (Requirements) or Class 2 (Contracts) decisions were breached or modified without approved ADR.
- [ ] New functionality is covered by automated unit and/or integration tests.
- [ ] All local validation gates (`npm run lint`, `npm test`, `npm run build`, `npm run qa:fast`) exit with code 0.
- [ ] Verifiable execution evidence is collected adhering to the 7-step evidence cycle (`EXPECTED → TEST → OBSERVED → CAUSE → SAFE REMEDIATION → RETEST → EVIDENCE`).
- [ ] Pull Request is created using standard template, with complete metadata, ticket links, and test evidence.
