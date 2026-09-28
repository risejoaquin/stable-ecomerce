# Architecture Decision Records (ADRs)

**Directory**: `docs/adr/`  
**Classification**: Authoritative Architectural Repository  
**Status**: ACTIVE / ENFORCED  
**Authority**: Technical & Release Authority (`@risejoaquin`)  

---

## 1. What is an Architecture Decision Record (ADR)?

An **Architecture Decision Record (ADR)** is a lightweight, version-controlled document that captures a significant architectural decision along with its context, considered options, technical rationale, and downstream consequences.

In this repository, ADRs serve as the authoritative historical record of technical decisions, contract definitions, and security invariants.

---

## 2. ADR Lifecycle & State Transitions

Every ADR progresses through a formal lifecycle:

```
┌──────────────┐     ┌──────────────┐
│   PROPOSED   │ ──> │   ACCEPTED   │ ──> (Enforced in Code & CI)
└──────────────┘     └──────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│   REJECTED   │     │  SUPERSEDED  │ (Replaced by newer ADR-XXX)
└──────────────┘     └──────────────┘
```

- **PROPOSED**: The decision is drafted and open for peer review and architectural evaluation.
- **ACCEPTED**: The decision has been reviewed and approved by the Technical Authority and relevant domain leads. It is now a binding standard.
- **REJECTED**: The proposed architecture was evaluated and explicitly declined. The rationale is preserved for future context.
- **SUPERSEDED**: A previously accepted ADR has been replaced by a newer decision. The header must link to the superseding ADR.

---

## 3. When is an ADR Required?

An ADR is **mandatory** whenever an engineering change:
1. Alters or introduces a cross-domain contract (e.g., API schemas, shared TypeScript models in `src/types/`).
2. Introduces or modifies database schemas, stored procedures, or RLS policies.
3. Introduces a new third-party dependency, framework, or cloud integration.
4. Alters security posture, authentication, authorization, or CSP headers.
5. Modifies payment flows, checkout idempotency, or transaction boundaries.

---

## 4. How to Author a New ADR

1. Copy [`docs/adr/ADR-TEMPLATE.md`](ADR-TEMPLATE.md) to `docs/adr/ADR-XXX-<short-title>.md`, where `XXX` is the next sequential 3-digit number.
2. Fill out all required sections: Context, Decision, Decision Classification, Consequences, and Compliance.
3. Submit a Pull Request with the label `architecture` or `docs`.
4. Secure approval from the Technical Authority (`@risejoaquin`) and relevant domain leads.

---

## 5. Architectural Decision Index

| ADR # | Title | Status | Classification | Date | Author / Deciders |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | [Unified Express + Vite Monolith Architecture](ADR-001-monolith-architecture.md) | `ACCEPTED` | FROZEN REQUIREMENT | 2026-08-15 | `@risejoaquin` |
| **ADR-002** | [Supabase Managed PostgreSQL & Strict RLS Baseline](ADR-002-supabase-postgresql-rls.md) | `ACCEPTED` | FROZEN CONTRACT | 2026-08-20 | `@risejoaquin`, `@bonjourrog` |
| **ADR-003** | [Stripe Checkout Server-Side Webhook Idempotency](ADR-003-stripe-checkout-idempotency.md) | `ACCEPTED` | FROZEN CONTRACT | 2026-08-25 | `@risejoaquin` |
| **ADR-004** | [Pino Structured JSON Logging & Sentry Boundary](ADR-004-pino-structured-logging.md) | `ACCEPTED` | DERIVED ENGINEERING DESIGN | 2026-09-01 | `@risejoaquin` |
| **ADR-005** | [AUDIT-01A Data Minimization & Public Projection Whitelist](ADR-005-audit-01a-data-minimization.md) | `ACCEPTED` | FROZEN CONTRACT | 2026-09-10 | `@risejoaquin` |
| **ADR-006** | [Zod Input Validation Schema Standard](ADR-006-zod-input-validation.md) | `ACCEPTED` | DERIVED ENGINEERING DESIGN | 2026-09-15 | `@bonjourrog` |
| **ADR-007** | [Atomic Concurrency Stock Decrement via Database RPC](ADR-007-atomic-stock-decrement-rpc.md) | `ACCEPTED` | FROZEN CONTRACT | 2026-09-20 | `@bonjourrog`, `@risejoaquin` |
| **ADR-008** | [Client 01 In-Browser Web POS Register Architecture](ADR-008-web-pos-register-architecture.md) | `ACCEPTED` | FROZEN REQUIREMENT | 2026-09-22 | `@Julian716`, `@bonjourrog` |
| **ADR-009** | [CSP Inline Script Elimination & Nonce Enactment](ADR-009-csp-inline-script-elimination.md) | `PROPOSED` | FROZEN CONTRACT | 2026-09-25 | `@risejoaquin` |
