# Engineering Change Control & Contract Management Standard

**Document ID**: `GOV-ENG-006`
**Classification**: Authoritative Engineering Governance
**Status**: ACTIVE / ENFORCED
**Applies To**: Technical Leads, Architects, Human Engineers, Autonomous Agents
**Authority**: Technical & Release Authority (`@risejoaquin`)

---

## 1. Principle & Purpose

The Client Commerce Platform enforces rigorous **Change Control** to ensure that stability, security, and architectural integrity are never compromised by ad-hoc modifications, premature optimizations, or uncoordinated contract shifts.

### Foundational Invariant
> **FROZEN CONTRACTS ARE IMMUTABLE DURING IMPLEMENTATION. ARCHITECTURAL DRIFT IS A BLOCKING DEFECT.**

---

## 2. Contract Freeze Protocol

### 2.1 What Constitutes a Contract?
A contract is any formal agreement across architectural boundaries whose modification affects more than one subsystem or domain owner:
1. **Public REST & RPC Endpoints**: Path, HTTP method, query parameters, request schemas, response DTOs, and HTTP error codes.
2. **Database Schemas & Stored Procedures**: Table structures, column data types, foreign keys, constraints, Row Level Security (RLS) policies, and RPC signatures.
3. **Shared TypeScript Interfaces**: All types defined in `src/types/` and core libraries in `src/lib/`.
4. **Third-Party Webhook Payloads**: Webhook ingestion structures and HMAC verification procedures (e.g. Stripe, Resend).

### 2.2 The Lifecycle of a Contract
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  DRAFTING    │ ──> │ CODEOWNER    │ ──> │ CONTRACT     │ ──> │ IMPLEMENTED  │
│  (ADR / Spec)│     │ REVIEW       │     │ FREEZE       │     │ & LOCKED     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 │ (Unfreeze Request)
                                                 ▼
                                          ┌──────────────┐
                                          │ RFC / ADR    │
                                          │ AMENDMENT    │
                                          └──────────────┘
```

1. **Drafting**: The proposed contract is authored in a ticket specification or draft ADR under `docs/adr/`.
2. **Review**: Both consuming and producing domain leads (e.g., Rogelio for backend, Julian for frontend) review the interface.
3. **Contract Freeze**: The Technical Authority (`@risejoaquin`) signs off, transitioning the decision to `FROZEN CONTRACT`.
4. **Implementation Lock**: Engineers build against mock fixtures or generated types. Neither side may alter the contract interface.

---

## 3. Protocol for Unfreezing or Amending Contracts

If an engineer discovers during implementation that a frozen contract is defective, insufficient, or technically flawed:

### Step 1: Immediate Implementation Halt
The engineer must **stop coding immediately**. Continuing to code against an altered or unilateral contract is strictly prohibited.

### Step 2: Draft an RFC / ADR Amendment
The engineer must prepare an amendment proposal containing:
- **Contract Reference**: The specific interface or schema file.
- **Flaw Description**: Technical demonstration of why the frozen contract fails.
- **Proposed Amendment**: Exact TypeScript / SQL diff of the requested change.
- **Impact Assessment**: All upstream and downstream systems affected.

### Step 3: Fast-Track Multi-Domain Review
The amendment must be submitted to the Technical Authority and affected domain codeowners.
- Review must be concluded within 4 business hours.
- Requires unanimous approval of consuming domain, producing domain, and Technical Authority.

### Step 4: Re-Freeze & Synchronized Update
Once approved:
1. The ADR or contract file is updated in Git.
2. Both domain branches are synchronized to the new frozen contract.
3. Implementation resumes.

---

## 4. Architectural Drift Prevention

Architectural drift occurs when small, undocumented decisions accumulate, creating disparities between documented architecture and runtime implementation.

### Drift Prevention Mechanisms:
1. **Automated Schema & Contract Checks**: CI hard gates run strict typechecking (`npm run lint`) to catch unauthorized type alterations.
2. **Codeowner Path Interception**: GitHub `.github/CODEOWNERS` automatically blocks PRs touching shared contracts without required approvals.
3. **Weekly Architectural Audits**: The Technical Authority inspects active PRs and git diffs against `ARCHITECTURE.md`.

---

## 5. Emergency Change Procedure (Hotfix Protocol)

An emergency change is defined strictly as an unpredicted, high-severity production incident:
- **P0 Priority**: Active customer checkout failure, data loss, security vulnerability exploitation, or complete service outage.

### The Expedited Hotfix Lifecycle
```
Production Incident
  ↓
Incident Triage & Issue Creation (`fix/ccp-hotfix-...`)
  ↓
Surgical Remediation (Minimal Root Cause Fix)
  ↓
Mandatory Local Fast Gate (`npm run qa:fast`)
  ↓
Expedited Technical Authority Review (`@risejoaquin`)
  ↓
Hotfix Release & Deployment
  ↓
Post-Incident Retro & Permanent Regression Test
```

### Hotfix Rules & Invariants:
1. **Never Bypass Testing**: An emergency is never justification for skipping the fast gate (`npm run qa:fast`) or secret scanner.
2. **No Bundled Changes**: Hotfixes must strictly contain the remediation for the single P0 defect. No opportunistic chores or refactors may be included.
3. **Mandatory Post-Mortem & Regression Test**:
   - Within 24 hours of hotfix deployment, a permanent automated regression test must be committed to prevent regression recurrence.
   - An incident summary must be documented under `docs/emergency/` or `AGENT_CONTEXT/handoffs/`.

---

## 6. Rollback & Abort Criteria

A deployment or release must be aborted or immediately rolled back if any of the following occur:
1. **Production Smoke Failure**: `scripts/qa/validate-production.ps1` returns exit code $\neq 0$.
2. **Critical Sentry Error Spike**: Uncaught exceptions exceed baseline threshold within 15 minutes of deployment.
3. **Database Migration Failure**: Supabase migration fails to apply or causes locks/timeouts.
4. **Payment Invariance Breach**: Any failure observed in Stripe checkout webhook processing or order creation.

When rollback criteria are met, the Release Authority triggers the documented rollback plan:
- Revert commit on `main`.
- Trigger immediate redeploy of previous stable commit on Railway.
- Apply database compensation or rollback migration if schema changes were introduced.
