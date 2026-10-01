# ADR-XXX: [Descriptive Title of the Decision]

**Status**: [PROPOSED | ACCEPTED | REJECTED | SUPERSEDED by ADR-YYY]
**Date**: YYYY-MM-DD
**Deciders**: [List names / GitHub handles, e.g., @risejoaquin, @bonjourrog, @Julian716]
**Technical Domain**: [Backend | Frontend | Database | Security | Infra | Payments]
**Classification**: [FROZEN REQUIREMENT | FROZEN CONTRACT | DERIVED ENGINEERING DESIGN | ENGINEER IMPLEMENTATION CHOICE]

---

## 1. Context & Problem Statement

<!-- Describe the context and problem being addressed. What forces, business drivers, or technical constraints exist? -->
[Describe the problem context in 1-3 paragraphs. Include any relevant bug reports, security findings (e.g., SEC-001), or performance metrics that necessitate this decision.]

---

## 2. Decision Drivers (Forces & Constraints)

<!-- What factors influence this choice? List trade-offs, constraints, and non-functional requirements. -->
- **Driver 1**: [e.g., Data minimization requirements under AUDIT-01A]
- **Driver 2**: [e.g., Concurrency integrity under high-volume checkout]
- **Driver 3**: [e.g., Strict CSP header compliance without unsafe-inline]
- **Driver 4**: [e.g., Single-monolith architecture constraint]

---

## 3. Considered Options

<!-- List the alternatives considered, including doing nothing or existing patterns. -->
- **Option 1**: [Name of option 1]
  - *Pros*: [Advantages]
  - *Cons*: [Disadvantages, trade-offs, risks]
- **Option 2**: [Name of option 2]
  - *Pros*: [Advantages]
  - *Cons*: [Disadvantages, trade-offs, risks]
- **Option 3 (Chosen)**: [Name of chosen option]
  - *Pros*: [Advantages]
  - *Cons*: [Disadvantages, trade-offs, risks]

---

## 4. Decision Outcome

<!-- State the chosen decision unambiguously. -->
**Chosen Decision**: [Option 3: Name of chosen option]

### Detailed Technical Specification & Contracts
<!-- Provide the technical contracts, schema definitions, RPC signatures, or interface types. -->
```typescript
// Insert frozen TypeScript interface, RPC signature, or API route definition here
```

### Rationale & Justification
[Explain why this option was selected over the alternatives. How does it resolve the decision drivers?]

---

## 5. Decision Classification & Immutability

This decision is formally classified as:
**[FROZEN REQUIREMENT | FROZEN CONTRACT | DERIVED ENGINEERING DESIGN | ENGINEER IMPLEMENTATION CHOICE]**

- **Immutability Scope**: [Specify what parts cannot be modified by engineers during ticket execution without a formal unfreeze request.]
- **Allowed Local Discretion**: [Specify what internal implementation details remain at the engineer's discretion.]

---

## 6. Consequences

### Positive Consequences
- [Positive outcome 1, e.g., Eliminated race condition on stock decrements]
- [Positive outcome 2, e.g., Reduced attack surface on public API endpoints]

### Negative Consequences / Trade-Offs
- [Trade-off 1, e.g., Requires explicit projection mapping on all future queries]
- [Trade-off 2, e.g., Slightly higher initial setup overhead for new endpoints]

---

## 7. Compliance & Automated Verification

<!-- How will this decision be enforced and validated in CI? -->
- **Automated Test Gate**: [e.g., Vitest contract test under tests/security/... or Playwright E2E scenario]
- **Static Analysis / Lint Rule**: [e.g., TypeScript compilation check, ESLint rule]
- **Review Check**: [Codeowner verification checklist in PR template]
