# Execution Pack: CCP-19 — Access Protection & Database Security — Login Rate Limiting & RLS Audit Verification

## 1. Responsibility
- **Lead Domain**: Database & Backend Security Architecture
- **Assignee Lead**: Rogelio (Backend / Database Lead) / Joaquin (Security Lead)
- **Secondary Reviewer**: QA Automation Lead

## 2. Objective
Enforce strict brute-force rate limiting on `/api/login` and `/api/auth/login` (maximum 5 failed attempts per 15-minute window per IP), audit PostgreSQL Row Level Security (RLS) policies across all application tables, verify that all critical stored procedures enforce `SECURITY DEFINER` with fixed `search_path = public, pg_temp;`, and validate zero high-severity findings via `scripts/qa/database/validate-database-security.ps1`.

## 3. Why
Fulfills **SEC-005** (Brute-Force Rate Limiting) and **SEC-018** (Database Function Privilege & RLS Audit). Public login endpoints without rate limiting allow credential stuffing and brute-force password discovery. Database functions without fixed `search_path` are vulnerable to search-path hijacking attacks, and unhardened RLS policies risk customer PII or financial leakage.

## 4. Owner Profile
Senior PostgreSQL / Security Engineer with expertise in PL/pgSQL function privileges, PostgreSQL Row Level Security (RLS), Express rate-limiting middleware, and automated security audit tooling.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- Database functions `decrement_stock`, `finalize_paid_order`, `restock_refunded_item`, and `decrement_sellable_unit_stock` present.
- `express-rate-limit` package installed and configured in repository.

## 6. Dependencies
- **Preceding Tickets**: CCP-44 (Contract Freeze Gate).
- **Downstream Blocking**: Blocks CCP-34 (Pre-Freeze System Validation) and CCP-36 (Hardening Window & Zero-Defect Signoff).

## 7. Authoritative Contracts
- **SEC-005 (Login Brute-Force Rate Limiting)**
- **SEC-018 (Database Function Privileges & RLS Hardening)**
- **DR-AUTH-001 (Web POS Operator RBAC & Route Protection)**
- `docs/engineering/client-01/12_SECURITY_INVARIANTS.md`

## 8. Scope IN
- Implementation of dedicated login rate limiter middleware:
  - Window: 15 minutes (`15 * 60 * 1000 ms`).
  - Max attempts: 5 requests per IP address.
  - Return HTTP 429 Too Many Requests with standard retry-after headers.
- Audit of Row Level Security (RLS) on tables `users`, `orders`, `order_items`, `order_payments`, `sellable_units`, `inventory_movements`, and `email_events`.
- Audit and enforcement of `SECURITY DEFINER` with `SET search_path = public, pg_temp;` on critical RPCs:
  - `decrement_stock`
  - `finalize_paid_order`
  - `restock_refunded_item`
  - `decrement_sellable_unit_stock`
  - `restock_sellable_unit`
- Revocation of `EXECUTE` grants on critical RPCs from `anon` / public role where appropriate.
- Execution and validation of `scripts/qa/database/validate-database-security.ps1`.
- Automated test coverage under `tests/api/login-rate-limit.test.ts`.

## 9. Scope OUT
- Modifying authentication providers or replacing Supabase Auth.
- Redesigning user password hashing algorithms.
- Changing customer storefront checkout logic.

## 10. Required Behavior
1. Successive requests to `/api/login` from the same client IP increment the attempt counter.
2. Upon reaching the 5th attempt within 15 minutes, subsequent requests are throttled with HTTP 429 and response header `Retry-After`.
3. All application database tables enforce `ENABLE ROW LEVEL SECURITY`.
4. Direct client queries using public Supabase anon key cannot read unauthorized customer data or execute stock decrement stored procedures.
5. All security validator scripts exit with code 0 PASS.

## 11. Inputs
- HTTP POST request to `/api/login` with credentials.
- SQL security audit inspection queries against Supabase PostgreSQL schema catalogs (`pg_proc`, `pg_tables`, `pg_policies`).

## 12. Outputs
- HTTP 429 Too Many Requests response with canonical JSON error on rate exhaustion.
- SQL migration/hardening script `supabase/migrations/20260928000003_harden_db_security.sql` (if corrections required).
- Validation report from `validate-database-security.ps1`.

## 13. Allowed Implementation Freedom
- Using in-memory store or Redis/ioredis for rate limiting tracking (in-memory standard for Client 01 monolith).
- Customizing Spanish user-friendly throttling error messages.

## 14. Forbidden Changes
- DO NOT disable RLS on any table.
- DO NOT create `SECURITY DEFINER` functions with variable or omitted `search_path`.
- DO NOT exempt local or test environments from rate limiter structure without explicit flag.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `server.ts` (rate limiter registration on login routes)
  - `src/server/middleware/rate-limiter.ts`
  - `supabase/migrations/20260928000003_harden_db_security.sql`
  - `tests/api/login-rate-limit.test.ts`
  - `scripts/qa/database/validate-database-security.ps1`
- **Strictly Prohibited**:
  - Frontend UI components or store presentation layer.

## 16. Data Impact
- Ensures RLS policies on all tables prevent cross-tenant and unauthenticated data access.
- Ensures function search-path parameters are explicitly locked.

## 17. API Impact
- Adds rate-limiting headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) to `/api/login`.
- Emits HTTP 429 when threshold exceeded.

## 18. Security
- Mitigates CWE-307 (Improper Restriction of Excessive Authentication Attempts) and CWE-426 (Untrusted Search Path).
- Enforces defense-in-depth across both network/API layer and database engine layer.

## 19. Concurrency & Idempotency
- Rate limiter state safely isolates client IPs under concurrent traffic.

## 20. Migration Considerations
- Function `ALTER` statements apply atomically without dropping table data or interrupting active connections.

## 21. Edge Cases
- Client behind proxy / Cloudflare / Railway load balancer: ensure `trust proxy` is configured in Express so `req.ip` reflects actual client rather than internal gateway IP.
- Rate-limited client making valid request: must remain throttled until window expires.

## 22. Observability
- Rate limit violations emit structured warning log: `{ "event": "rate_limit_exceeded", "ip": req.ip, "route": "/api/login" }`.

## 23. Acceptance Criteria
- [ ] Repeated failed login attempts beyond 5 within 15 minutes are throttled with HTTP 429.
- [ ] Throttled response includes `Retry-After` header and human-readable message.
- [ ] All database RPCs (`decrement_stock`, `finalize_paid_order`, `restock_refunded_item`, `decrement_sellable_unit_stock`) enforce `SECURITY DEFINER` and `search_path = public, pg_temp;`.
- [ ] Tables `users`, `orders`, `order_payments`, `sellable_units` have RLS enabled.
- [ ] Automated check `scripts/qa/database/validate-database-security.ps1` exits with code 0 PASS (0 high vulnerabilities).

## 24. Test Strategy
- Automated database security script:
  ```powershell
  .\scripts\qa\database\validate-database-security.ps1
  ```
- Supertest login rate limit suite:
  ```bash
  npm test tests/api/login-rate-limit.test.ts
  ```

## 25. Staging Validation
- Execute 6 rapid requests to staging `/api/login`; assert 6th request receives HTTP 429.
- Run `validate-database-security.ps1` against staging Supabase database connection string.

## 26. Evidence Requirements
- Terminal execution output of `validate-database-security.ps1` showing 0 high-severity security findings.
- Supertest transcript demonstrating HTTP 429 after 5 requests.

## 27. Definition of Done
- Validation script and rate limiter tests pass with exit code 0.
- Database security sign-off confirmed by Technical Authority (@risejoaquin).
- P1 Security Gate closed for CCP-34 and CCP-36.

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: QA Lead (consume in CCP-34 Pre-Freeze Validation and CCP-36 Hardening Window).
