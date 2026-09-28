# Execution Pack: CCP-28 — POS Backend Authorization & Security Middleware

## 1. Responsibility
- **Lead Domain**: Security & Backend Engineering
- **Assignee Lead**: Julian (Backend / Security Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Implement reusable Express security middleware (`authenticateToken`, `requireRoles`, `requirePosOperator`) enforcing **DR-AUTH-001** across all `/api/pos/*` and `/api/admin/*` endpoints, extracting verified staff identities from JWTs and logging structured audit events.

## 3. Why
Fulfills **DR-AUTH-001**. Ensuring that only authorized staff (`owner` and `admin`) can access point-of-sale operational APIs is essential for physical and commercial security. The middleware prevents unauthorized access by regular customers or support agents and establishes an unbypassable audit trail.

## 4. Owner Profile
Senior Backend / Security Engineer with expertise in Express middleware pipelines, JWT cryptography, Supabase Auth integration, and RBAC defense-in-depth patterns.

## 5. Preconditions
- `docs/engineering/client-01/07_AUTHORIZATION_CONTRACT.md` and `12_SECURITY_INVARIANTS.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-44.
- **Downstream Blocking**: Blocks CCP-14 (POS Sales Backend API) and CCP-15 (POS Search & Catalog Read).

## 7. Authoritative Contracts
- **DR-AUTH-001 (Authorization Model)**
- **DR-ERR-001 (Standard Error Envelope)**
- `docs/engineering/client-01/07_AUTHORIZATION_CONTRACT.md`
- `docs/engineering/client-01/12_SECURITY_INVARIANTS.md`

## 8. Scope IN
- Middleware `authenticateToken` verifying Bearer JWT against Supabase Auth.
- Middleware `requireRoles` inspecting the authenticated user's role against permissible roles.
- Composed guard `requirePosOperator` restricting endpoints to `owner` and `admin`.
- Helper service `logAuditEvent` writing structured actor events to `audit_logs`.
- Integration of DR-ERR-001 error envelopes for `401 AUTH_REQUIRED` and `403 FORBIDDEN`.
- Unit and integration tests covering the entire authorization matrix.

## 9. Scope OUT
- Managing user passwords, reset tokens, or email verifications.
- Provisioning new user roles in the database.
- Storefront public authorization logic.

## 10. Required Behavior
1. Extract Bearer token from `Authorization` header. If missing, return `401 AUTH_REQUIRED`.
2. Verify token with `supabaseAdmin.auth.getUser(token)`. If invalid or expired, return `401 AUTH_REQUIRED`.
3. Query `users` table for user's authoritative role.
4. If role is not in allowed list (e.g. caller is `user` or `support`), return `403 FORBIDDEN`.
5. Attach typed user object `{ id, email, role, fullName }` to Express `req.user`.
6. Provide `logAuditEvent` utility for route handlers.

## 11. Inputs
- HTTP request headers: `Authorization: Bearer <token>`.
- Allowed roles parameter array.

## 12. Outputs
- Populates `req.user` for downstream route handlers.
- Halts execution with JSON error envelope on authentication or authorization failure.

## 13. Allowed Implementation Freedom
- Internal caching of user role profiles (e.g. 30-second in-memory LRU) to optimize performance under heavy traffic.
- File organization of security middleware under `src/middleware/auth/`.

## 14. Forbidden Changes
- DO NOT allow unauthenticated or anonymous access to any `/api/pos/*` endpoint.
- DO NOT introduce a new "cashier" role in the database or middleware.
- DO NOT bypass token verification for local testing unless explicitly stubbed in test fixtures.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/middleware/auth.ts`
  - `src/services/audit-service.ts`
  - `src/types/auth.ts`
  - `tests/unit/middleware/auth.test.ts`
- **Strictly Prohibited**:
  - Frontend components under `src/pages/*`.

## 16. Data Impact
- Inserts audit records into `audit_logs`. Read queries against `users` table.

## 17. API Impact
- Secures all existing and future `/api/pos/*` and `/api/admin/*` endpoints.

## 18. Security
- Eliminates broken object-level and function-level authorization vulnerabilities (OWASP API1 & API5).
- Prevents role spoofing by verifying token server-side against Supabase.

## 19. Concurrency & Idempotency
- Pure authentication guard. Execution is stateless per request.

## 20. Migration Considerations
- Compatible with all existing user accounts in the production database.

## 21. Edge Cases
- Revoked or deleted user: user table lookup returns null, middleware rejects with `403 FORBIDDEN`.
- Malformed header (e.g. `Bearer` without token): rejected with `401 AUTH_REQUIRED`.

## 22. Observability
- Emits security warning log whenever an authenticated user attempts to access a forbidden route.

## 23. Acceptance Criteria
- [ ] Missing token returns 401 with standard error envelope.
- [ ] Expired token returns 401 with standard error envelope.
- [ ] User with role `user` receives 403 `FORBIDDEN` when accessing POS routes.
- [ ] User with role `support` receives 403 `FORBIDDEN` when accessing POS routes.
- [ ] User with role `admin` or `owner` successfully passes middleware.

## 24. Test Strategy
- Vitest unit tests with mock JWTs covering all role combinations, expired tokens, and missing headers.

## 25. Staging Validation
- Make curl calls with anonymous, customer, and admin tokens to `/api/pos/catalog/search` on staging; assert correct HTTP status codes.

## 26. Evidence Requirements
- Passing Vitest execution logs (`npm test tests/unit/middleware/auth.test.ts`).
- Full matrix test report output.

## 27. Definition of Done
- Security middleware thoroughly tested and reviewed.
- Zero TypeScript diagnostics.
- Ready for integration across all POS route handlers.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Julian (apply middleware across CCP-14 and CCP-15).
