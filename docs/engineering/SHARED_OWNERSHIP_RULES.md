# Shared Codebase Ownership & Domain Boundaries

**Document ID**: `GOV-ENG-007`
**Classification**: Authoritative Engineering Governance
**Status**: ACTIVE / ENFORCED
**Applies To**: All Engineering Teams, Codeowners, Autonomous Agents
**Authority**: Technical & Release Authority (`@risejoaquin`)

---

## 1. Principle & Purpose

The **Client Commerce Platform (Selfcare Sinners)** operates as a unified repository (monolith architecture). While all engineers operate within the same repository, strict domain boundaries and codeownership partitions are enforced to eliminate boundary friction, prevent merge collision deadlocks, and preserve subsystem cohesion.

---

## 2. Domain Ownership Matrix

Codeownership is strictly enforced via `.github/CODEOWNERS`. The matrix below defines the primary domain authority, responsible engineer, and designated reviewer for each subsystem:

```
┌────────────────────────────────────────────────────────────────────────┐
│ SUBSYSTEM OWNERSHIP MATRIX                                             │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│ Subsystem / Domain   │ Primary Domain Owner │ Key Repository Paths     │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Backend Application  │ Rogelio Beltran      │ /server.ts               │
│ & REST/RPC Endpoints │ (@bonjourrog)        │ /src/server/             │
│                      │                      │ /src/api/                │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Database, Schemas,   │ Rogelio Beltran      │ /supabase/               │
│ RLS & Migrations     │ (@bonjourrog)        │ /scripts/db/             │
│                      │                      │ /docs/database/          │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Inventory Concurrency│ Rogelio Beltran      │ /src/server/pos/         │
│ & Stock Decrement RPC│ (@bonjourrog)        │ /scripts/qa/database/    │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Web POS Register UI  │ Julian Rodriguez     │ /src/pages/pos/          │
│ & Cashier Workflows  │ (@Julian716)         │ /src/components/pos/     │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Storefront UI, Theme │ Julian Rodriguez     │ /src/pages/ (storefront) │
│ & Customer Journey   │ (@Julian716)         │ /src/components/         │
│                      │                      │ /src/styles/, /public/   │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Admin Command Center │ Julian Rodriguez     │ /src/pages/admin/        │
│ & Backoffice UI      │ (@Julian716)         │ /src/components/admin/   │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Shared Contracts,    │ Shared Responsibility│ /src/types/              │
│ DTOs & Core Utils    │ (@bonjourrog +       │ /src/lib/                │
│                      │  @Julian716)         │ /src/routes/             │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ Security, CI/CD,     │ Joaquin              │ /.github/                │
│ Release & Governance │ (@risejoaquin)       │ /scripts/qa/security/    │
│                      │                      │ /package.json, root      │
└──────────────────────┴──────────────────────┴──────────────────────────┘
```

---

## 3. Boundary Interaction & Contract Handoff Protocols

Cross-boundary work (e.g., frontend Web POS consuming backend atomic stock decrement) must adhere to the following sequence:

### 3.1 Backend-First Contract Provisioning
1. **Contract Freeze**: Backend engineer (`@bonjourrog`) defines and freezes the API schema, request parameters, response DTOs, and error types in `src/types/`.
2. **Mock / Staging Availability**: Backend provides mock fixtures or a merged backend endpoint on `main`.
3. **Frontend Implementation**: Frontend engineer (`@Julian716`) pulls the frozen contract and implements UI components against the agreed contract.
4. **Integration Validation**: Once both are ready, an end-to-end integration test is executed to verify runtime handshake.

### 3.2 Shared Contracts Governance (`/src/types/`, `/src/lib/`)
Files in `/src/types/` and `/src/lib/` represent shared common ground.
- **Dual Sign-Off**: Any modification to shared types requires approval from **both** domain owners (`@bonjourrog` AND `@Julian716`).
- **Release Authority Oversight**: The Technical Authority (`@risejoaquin`) must confirm that shared contract changes do not break downstream production services or audit requirements.

---

## 4. Concurrent Pull Requests & Merge Ordering

When multiple engineers work concurrently, merge collisions and race conditions can occur. To mitigate this:

### 4.1 Git Worktree Isolation
Engineers (especially autonomous agentic workers) must develop in isolated git worktrees (e.g. `worktrees/agent-a`, `worktrees/agent-b`). This ensures independent staging areas, clean builds, and zero cross-contamination of working trees.

### 4.2 Merge Ordering Hierarchy
When two PRs touch adjacent areas, merges are sequenced according to technical dependency:
1. **Tier 1 (Foundation)**: Database migrations and schema definitions must merge first.
2. **Tier 2 (Service Layer)**: Backend RPCs and Express endpoint handlers merge second.
3. **Tier 3 (Presentation Layer)**: Frontend views and UI integrations merge third.
4. **Tier 4 (Chore / Docs)**: Governance and documentation PRs merge continuously.

### 4.3 Rebase & Conflict Resolution Policy
- If PR B's branch falls behind `main` because PR A merged:
  1. The author of PR B must run `git fetch origin` and `git rebase origin/main`.
  2. The author of PR B must resolve conflicts locally.
  3. Re-run local validation (`npm run qa:fast`).
  4. Force-push to PR B's feature branch (allowed ONLY on individual feature branches, never on `main`).
- In case of conflicting architectural directions between domain owners, the Technical Authority (`@risejoaquin`) acts as final arbiter.
