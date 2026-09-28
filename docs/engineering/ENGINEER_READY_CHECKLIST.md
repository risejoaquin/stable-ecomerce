# Engineer Ready Checklist (Definition of Ready - DoR)

**Document ID**: `GOV-ENG-003`  
**Classification**: Authoritative Engineering Governance  
**Status**: ACTIVE / ENFORCED  
**Applies To**: Product Owners, Technical Leads, Architects, Assigned Engineers  
**Authority**: Technical & Release Authority (`@risejoaquin`)  

---

## 1. Purpose & Gating Policy

The **Definition of Ready (DoR)** is an immutable hard gate separating the planning/design phases from active engineering implementation. 

### Gating Invariant
> **NO TICKET ENTERS `Ready` OR `In Progress` WITHOUT 100% SATISFACTION OF THIS CHECKLIST.**

Implementing underspecified, ambiguously scoped, or contractually unfrozen work items leads to architectural drift, broken builds, merge conflicts, and wasted engineering cycles. A ticket failing any single mandatory item in this checklist must remain in `Requirements Ready`, `Design Ready`, or `Contract Freeze` until rectified.

---

## 2. The 10-Point Readiness Verification Checklist

Every Jira ticket must be verified against these 10 criteria before development begins:

### 1. Objective & Value Context
- [ ] **Unambiguous Objective**: The primary outcome is stated in 1–2 sentences describing the observable technical or user behavior change.
- [ ] **Architectural & Business Rationale**: The "Why" is explicitly detailed, explaining the problem solved or value delivered to the platform.
- [ ] **Architecture Lifecycle Alignment**: The work is explicitly categorized under `CURRENT` (existing production code), `PLANNED` (active sprint scope, e.g. Web POS, stock concurrency), or `FUTURE` (long-term roadmap).

### 2. Scope Boundaries (IN vs OUT)
- [ ] **Explicit Scope IN**: Bulleted list of exact files, features, endpoints, or components to be modified or created.
- [ ] **Explicit Scope OUT**: Bulleted list of adjacent features, optimizations, or refactors that are strictly prohibited from being touched in this ticket.
- [ ] **No Ambiguous Language**: No open-ended terms such as "etc.", "and other improvements", "clean up codebase", or "general enhancements".

### 3. Authoritative Contract & Design References
- [ ] **Design Artifacts Linked**: UI mockups (Figma), wireframes, or sequence diagrams are finalized and attached.
- [ ] **Frozen Architecture Decision Records**: Applicable ADRs (under `docs/adr/`) are cited and confirmed in `ACCEPTED` status.
- [ ] **Interface & Schema Contracts Frozen**: 
  - REST/RPC endpoints: Path, HTTP method, request headers, query params, request body schema, response DTO schema, error response schemas.
  - TypeScript types: Explicit interface definitions drafted or referenced in `src/types/`.

### 4. Dependency Mapping & Sequential Blockers
- [ ] **Preceding Tickets Completed**: All predecessor tickets (e.g. database schema migrations or backend API endpoints) are merged to `main` and verified.
- [ ] **No Open Upstream Blockers**: The ticket has zero open blocking dependencies in Jira.
- [ ] **Downstream Consumers Notified**: Teams or tickets relying on this output are identified (e.g. Frontend waiting on Backend contract).

### 5. Single Designated Owner & Codeowner Alignment
- [ ] **Named Individual Assignee**: Exactly one qualified primary engineer is assigned in Jira.
- [ ] **Domain Codeowner Identified**: The primary reviewer from `.github/CODEOWNERS` is documented:
  - Backend / Database / Orders: `@bonjourrog`
  - Frontend / UI / POS Register: `@Julian716`
  - Architecture / Security / Release: `@risejoaquin`

### 6. Security, Privacy & Threat Assessment
- [ ] **Data Minimization Verified**: All data returned to clients adheres to AUDIT-01A (no unbounded `.select('*')`, no sensitive fields exposed).
- [ ] **Authentication & Authorization Defined**: Role requirements (Public Anon, Authenticated User, Admin, Service Role) are explicitly declared.
- [ ] **Rate Limiting & Abuse Prevention**: Applicable rate limits or idempotency keys are specified.
- [ ] **Zero Secret Policy**: Confirmed that no secret keys or credentials will be logged or exposed.

### 7. Database & Schema Migration Impact
- [ ] **Schema Changes Declared**: Indicates `NONE` or specifies the exact table, column, index, or constraint modifications.
- [ ] **RLS Policy Specified**: If a new table or view is introduced, the Row Level Security (RLS) policies are fully drafted.
- [ ] **RPC Signatures Frozen**: Database functions (e.g. stock decrement, coupon redemption) have explicit parameters and return types defined.
- [ ] **Rollback Script Drafted**: Downward migration or compensation script is prepared.

### 8. Observability & Logging Strategy
- [ ] **Structured Log Events**: Event names and log levels (e.g. Pino `logger.info`, `logger.warn`, `logger.error`) are documented.
- [ ] **Error Handling & Sentry**: Expected error classes and exception boundaries are identified.
- [ ] **Telemetry / Metrics**: Any new performance or business metrics to emit are listed.

### 9. Test Strategy & Acceptance Criteria
- [ ] **Given / When / Then Criteria**: Acceptance criteria are written as testable, unambiguous statements.
- [ ] **Automated Test Targets**:
  - Unit Tests: Vitest suite paths specified.
  - Integration Tests: API route or database integration test plans detailed.
  - End-to-End: Playwright user journey scenarios identified (if user-facing).

### 10. Evidence & Proof-of-Work Requirements
- [ ] **Evidence Expectations Stated**: The ticket outlines the required verification artifacts (e.g. test runner terminal output, build logs, network trace, screenshot).
- [ ] **Local Quality Gates Listed**: Verification commands specified (`npm run lint`, `npm test`, `npm run build`, `npm run qa:fast`).

---

## 3. Readiness Gate Sign-Off Protocol

| Role | Responsibility | Authority |
| :--- | :--- | :--- |
| **Technical Authority (`@risejoaquin`)** | Reviews architecture alignment, security considerations, and contract freeze. | Final veto power over readiness. |
| **Domain Owner (`@bonjourrog` / `@Julian716`)** | Verifies technical feasibility, dependency resolution, and test strategy. | Signs off domain DoR. |
| **Assigned Engineer** | Reviews ticket for completeness and confirms absence of ambiguous requirements. | May reject ticket back to refinement if underspecified. |

### Ticket Rejection Protocol
If an engineer pulls a ticket and finds that any item of this checklist is missing or ambiguous:
1. **Halt Progression**: Do not transition the ticket to `In Progress`.
2. **Comment on Jira**: Post a structured comment detailing which checklist items failed.
3. **Transition to Refinement**: Revert ticket status to `Requirements Ready` or `Design Ready`.
4. **Notify Technical Authority**: Request clarification or contract freeze completion before resuming.
