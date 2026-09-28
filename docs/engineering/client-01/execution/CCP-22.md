# Execution Pack: CCP-22 — POS Operator Authorization & Admin Portal Protection

## 1. Responsibility
- **Lead Domain**: Security, Authentication & Backend Architecture
- **Assignee Lead**: Rogelio (Backend / Security Lead)
- **Secondary Reviewer**: Julian (Frontend Lead)

## 2. Objective
Implement and enforce the authoritative Role-Based Access Control (RBAC) middleware `requirePosOperator` across all Web POS endpoints, strictly restricting cashier operations to authenticated users with roles `owner` or `admin`, preserving existing admin portal protections, and ensuring that unauthorized roles (`user`, `support`, or unauthenticated requests) are deterministically rejected with standard HTTP 401/403 responses conforming to `DR-ERR-001`. Do NOT introduce a `cashier` role.

## 3. Why
Fulfills **DR-AUTH-001** and closes security vulnerabilities around in-store point of sale. Without strict server-side authorization guards, regular ecommerce customers or support personnel could access POS endpoints, trigger cash sales, decrement inventory without payment, or view customer order histories. Route hiding in the frontend is insufficient; backend enforcement is mandatory.

## 4. Owner Profile
Senior Backend / Security Engineer with expertise in Express middleware pipelines, JWT/session token authentication, RBAC permission matrices, and automated security test harnesses.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- `docs/engineering/client-01/07_AUTHORIZATION_CONTRACT.md` (DR-AUTH-001) reviewed and frozen.
- Supabase Auth session token verification operational.

## 6. Dependencies
- **Preceding Tickets**: CCP-44 (Contract Freeze Gate).
- **Downstream Blocking**: Blocks CCP-14 (Web POS Sale API), CCP-34 (Pre-Freeze System Validation), and CCP-43 (Web POS Register UI).

## 7. Authoritative Contracts
- **DR-AUTH-001 (Web POS Operator RBAC & Route Protection)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/07_AUTHORIZATION_CONTRACT.md`
- `docs/engineering/client-01/12_SECURITY_INVARIANTS.md`

## 8. Scope IN
- Middleware function `requirePosOperator` in `src/server/middleware/auth.ts`:
  - Validates active user session token via Supabase Auth or session cookie.
  - Queries user role from authenticated context / `users` table.
  - Permits request if role is strictly `'admin'` or `'owner'`.
  - Rejects unauthenticated request with HTTP 401 `UNAUTHORIZED`.
  - Rejects authenticated user with role `'user'` or `'support'` with HTTP 403 `FORBIDDEN`.
- Applying `requirePosOperator` across all `/api/pos/*` endpoints:
  - `POST /api/pos/sales`
  - `GET /api/pos/orders`
  - `GET /api/pos/orders/:id`
  - `POST /api/pos/orders/:id/refund`
- Client-side route guard integration for `/pos/*` in `src/routes/` matching backend policy.
- Automated test coverage in `tests/api/pos-auth-rbac.test.ts`.

## 9. Scope OUT
- Introducing a new `cashier` role in database or schema (explicitly forbidden for Client 01).
- Modifying customer storefront authentication or password recovery.
- Altering existing admin portal permission scopes.

## 10. Required Behavior
1. Unauthenticated request to `/api/pos/sales` or `/api/pos/orders` returns:
   ```json
   {
     "error": {
       "code": "UNAUTHORIZED",
       "message": "Authentication required to access Web POS endpoints."
     }
   }
   ```
2. Request from authenticated user with role `user` or `support` returns:
   ```json
   {
     "error": {
       "code": "FORBIDDEN",
       "message": "Insufficient permissions. Web POS access is restricted to store administrators and owners."
     }
   }
   ```
3. Request from authenticated user with role `admin` or `owner` passes middleware and attaches `req.user = { id, email, role, name }`.
4. Route guards in frontend redirect unauthorized users away from `/pos` to `/login` or `/unauthorized`.

## 11. Inputs
- HTTP request with Authorization bearer token or Supabase session cookie.

## 12. Outputs
- `next()` invocation for authorized staff (`owner` / `admin`).
- HTTP 401 / 403 JSON error response for unauthorized callers.

## 13. Allowed Implementation Freedom
- Internal caching of user role lookups (e.g. short-lived in-memory LRU cache) to optimize high-frequency POS requests.
- Custom middleware naming for combined guards.

## 14. Forbidden Changes
- DO NOT introduce a `cashier` role in this release; only `owner` and `admin` are authorized.
- DO NOT rely on client-side route hiding as the sole protection mechanism.
- DO NOT expand POS operator privileges to arbitrary database management tasks.
- DO NOT bypass authentication in local development mode without explicit test environment flags.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/server/middleware/auth.ts`
  - `server.ts` (middleware attachment to `/api/pos/*`)
  - `src/routes/` (client-side route protection)
  - `tests/api/pos-auth-rbac.test.ts`
- **Strictly Prohibited**:
  - Database schema alterations to add roles.

## 16. Data Impact
- Zero database migrations or schema alterations.

## 17. API Impact
- Secures all `/api/pos/*` routes behind `requirePosOperator`.
- Conforms to standard error envelope `DR-ERR-001`.

## 18. Security
- Enforces Principle of Least Privilege and mitigates CWE-285 (Improper Authorization) and CWE-862 (Missing Authorization).
- Ensures non-staff accounts cannot interact with physical retail checkout APIs.

## 19. Concurrency & Idempotency
- Stateless token verification executes safely across high concurrency without lock contention.

## 20. Migration Considerations
- None. Applies to new and existing `/api/pos/*` endpoints directly.

## 21. Edge Cases
- Expired JWT token: cleanly returns HTTP 401 with `TOKEN_EXPIRED`.
- Tampered JWT token: cleanly returns HTTP 401 `INVALID_TOKEN`.
- User deleted from database while holding active token: database validation check rejects request.

## 22. Observability
- Emits security warning log on forbidden access attempts: `{ "event": "pos_unauthorized_access", "ip": req.ip, "userId": req.user?.id, "role": req.user?.role }`.

## 23. Acceptance Criteria
- [ ] Unauthenticated requests to `/api/pos/*` receive HTTP 401 Unauthorized.
- [ ] Authenticated users with role `user` receive HTTP 403 Forbidden.
- [ ] Authenticated users with role `support` receive HTTP 403 Forbidden.
- [ ] Authenticated users with role `admin` successfully execute POS endpoints.
- [ ] Authenticated users with role `owner` successfully execute POS endpoints.
- [ ] No `cashier` role is created in the database or authorization checks.
- [ ] Automated tests in `tests/api/pos-auth-rbac.test.ts` pass with 100% assertions green.

## 24. Test Strategy
- Vitest + Supertest automated suite verifying authorization matrix:
  | Role | Endpoint | Expected Status |
  | :--- | :--- | :---: |
  | Anonymous | `/api/pos/sales` | 401 |
  | `user` | `/api/pos/sales` | 403 |
  | `support` | `/api/pos/sales` | 403 |
  | `admin` | `/api/pos/sales` | 200/400 (Authorized) |
  | `owner` | `/api/pos/sales` | 200/400 (Authorized) |

## 25. Staging Validation
- Attempt curl request with customer token to Railway staging `/api/pos/sales`; assert HTTP 403 response.
- Repeat with store admin token; assert authorized execution.

## 26. Evidence Requirements
- Terminal execution output of `npm test tests/api/pos-auth-rbac.test.ts` showing all 5 authorization roles validated.

## 27. Definition of Done
- Middleware implemented, attached, and verified.
- Code reviewed and approved by Frontend Lead (Julian) and Technical Authority (Joaquin).
- Ready for integration with Web POS Sale API (CCP-14) and Register UI (CCP-43).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Rogelio (consume middleware on CCP-14 Web POS Sale API) and Julian (integrate with CCP-43 Web POS Register UI).
