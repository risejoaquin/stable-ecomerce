# Ticket Readiness Template (Jira Specification Standard)

**Document ID**: `GOV-ENG-004`
**Classification**: Authoritative Engineering Governance Template
**Status**: ACTIVE / ENFORCED
**Applies To**: Product Owners, Tech Leads, Architects, Engineers Authoring Jira Tickets
**Authority**: Technical & Release Authority (`@risejoaquin`)

---

## Instructions for Authors
When authoring or refining a Jira ticket for the Client Commerce Platform (Selfcare Sinners), copy the markdown template below into the Jira ticket description or an attached specification document. **All sections are mandatory.** If a section is not applicable, explicitly state `NONE` along with a brief technical justification.

---

```markdown
# [CCP-XXX]: <Concise, Imperative Ticket Title>

## 1. Objective
<!-- 1-2 sentences stating the clear technical outcome or user capability delivered by this ticket. -->
[Describe what will be built, fixed, or verified.]

## 2. Why (Context & Business/Architectural Value)
<!-- Explain the rationale. What problem does this solve? What business or architectural requirement does it satisfy? -->
- **Business Driver**: [Why is this needed from a commercial/operational perspective?]
- **Architectural Driver**: [How does this fit into the monolith/database/UI architecture?]
- **Architecture Lifecycle Tier**: [CURRENT | PLANNED | FUTURE]

## 3. Scope IN
<!-- Bulleted list of explicitly included work, features, files, endpoints, or UI states. -->
- [ ] [Feature / component 1]
- [ ] [API endpoint / handler 2]
- [ ] [Automated tests covering scenarios A & B]

## 4. Scope OUT
<!-- Bulleted list of explicitly excluded work, adjacent components, or premature optimizations. -->
- [ ] [Adjacent refactoring or cleanups]
- [ ] [Secondary UI polish or unsupported edge cases]
- [ ] [Hardware driver integrations or microservice extractions]

## 5. Owner & Reviewers
- **Assigned Primary Engineer**: [Name / GitHub handle, e.g., @bonjourrog or @Julian716]
- **Domain Codeowner**: [Primary reviewer per .github/CODEOWNERS]
- **Release Authority**: `@risejoaquin`

## 6. Dependencies
- **Preceding Tickets (Blockers)**: [e.g., CCP-101 (Database migration) - MUST BE MERGED FIRST]
- **Downstream Consumers**: [e.g., CCP-105 (Frontend POS Register UI depends on this API)]
- **Concurrent In-Flight PRs**: [List any PRs touching overlapping files]

## 7. Authoritative Design & Frozen Contracts
<!-- Reference the frozen specifications, ADRs, Figma files, or schema snapshots governing this work. -->
- **ADR Reference**: [e.g., docs/adr/ADR-009-csp-inline-script-elimination.md]
- **Design Spec / Mockups**: [Figma URL or docs/design/ link]
- **API Contract**:
  - **Method & Route**: `POST /api/v1/...`
  - **Auth Required**: [None (Public) | Authenticated User | Admin Role | Service Role]
  - **Request Schema (Zod / JSON Schema)**:
    ```typescript
    // Insert frozen request interface here
    ```
  - **Response DTO Schema**:
    ```typescript
    // Insert frozen response interface here
    ```
  - **Error Codes**: `400 INVALID_INPUT`, `401 UNAUTHORIZED`, `409 STOCK_CONFLICT`, etc.

## 8. Inputs
<!-- External inputs consumed by this component/endpoint. -->
- Query parameters, route parameters, headers, body payload, webhook signature headers, or database rows.

## 9. Outputs
<!-- Explicit artifacts, state mutations, or responses produced. -->
- HTTP status codes, JSON payload structure, database rows inserted/updated, log events emitted.

## 10. Allowed Implementation Freedom (Class 3 & 4 Decisions)
<!-- Where the engineer has autonomy to design internal structures. -->
- Internal private helper function modularization.
- Local state management hook implementation within domain boundary.
- Vitest test fixture structuring and mocking strategy.

## 11. Prohibited Changes
<!-- Actions strictly forbidden during the execution of this ticket. -->
- DO NOT alter frozen TypeScript interfaces in `src/types/` without an approved ADR amendment.
- DO NOT touch unrelated files or run broad linter auto-fixes across the repo.
- DO NOT weaken test assertions or skip CI quality gates.
- DO NOT expose raw database columns via unbounded `.select('*')`.

## 12. Likely Repository Areas
<!-- Directories and files expected to be created or modified. -->
- `src/server/...`
- `src/components/...`
- `tests/...`

## 13. Security Implications
- **Data Minimization (AUDIT-01A)**: [Verify projection whitelisting and no sensitive data leakage.]
- **Authentication & Authorization**: [How is the caller authenticated and permissions enforced?]
- **Secret Handling**: [Confirm zero API keys or secrets logged/stored.]
- **Input Sanitization**: [Strict validation on all incoming fields.]

## 14. Database & Migration Implications
- **Schema Changes**: [NONE | Migration file name: supabase/migrations/YYYYMMDD_xxx.sql]
- **RLS Policies**: [List required Row Level Security policies]
- **RPC / Functions**: [List database functions called or created, e.g., decrement_stock]
- **Rollback Strategy**: [SQL script or mechanism to undo schema changes]

## 15. Observability & Telemetry
- **Pino Structured Log Events**:
  - `logger.info({ event: 'event_name', entityId }, 'Descriptive message')`
  - `logger.error({ event: 'event_failed', err }, 'Error message')`
- **Sentry Exception Capture**: [Any critical boundary exceptions captured]
- **Metrics / Counters**: [Any telemetry recorded]

## 16. Acceptance Criteria
<!-- Verifiable, testable criteria written in Given/When/Then or checklist form. -->
- [ ] **AC 1**: Given [valid request payload], when [endpoint is called], then return [200 OK with expected DTO].
- [ ] **AC 2**: Given [invalid input], when [endpoint is called], then return [400 BAD_REQUEST with validation details].
- [ ] **AC 3**: Given [concurrency conflict], when [two updates occur simultaneously], then return [409 CONFLICT and preserve stock invariant].

## 17. Test Strategy
- **Unit Tests**: [Vitest suite under tests/... covering edge cases and boundary conditions]
- **Integration Tests**: [API integration test validating DB interactions]
- **E2E Tests**: [Playwright test under e2e/... for user-facing journey]
- **Regression Suite**: [Confirm existing regression suites pass]

## 18. Evidence Requirements (7-Step Model)
<!-- Exact artifacts required to prove completion before PR approval. -->
- Terminal output of:
  - `npm run lint` (Exit code 0)
  - `npm test` (Exit code 0, all tests pass)
  - `npm run build` (Exit code 0)
  - `npm run qa:fast` (Exit code 0)
- Execution trace of the 7-step evidence cycle:
  `EXPECTED → TEST → OBSERVED → CAUSE → SAFE REMEDIATION → RETEST → EVIDENCE`
- Screenshots / video recording (if user interface change).

## 19. Definition of Done (DoD)
- [ ] All Scope IN items implemented.
- [ ] Scope OUT items untouched.
- [ ] All Acceptance Criteria verified by automated tests.
- [ ] Local validation commands exit 0.
- [ ] Codeowner peer review approved.
- [ ] CI Hard Gates green.
- [ ] Documentation and comments updated.

## 20. Escalation Protocol
- If blocked by upstream ticket: notify [Domain Lead / Tech Authority].
- If contract flaw discovered: stop implementation, draft unfreeze request per `docs/engineering/CHANGE_CONTROL.md`.
- If CI fails due to environmental runner failure: escalate to `@risejoaquin`.

## 21. Next Consumer
- [Name of next engineer / Jira ticket consuming this output, e.g., Julian / CCP-105 for frontend integration.]
```
