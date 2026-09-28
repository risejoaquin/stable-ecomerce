# Execution Pack: CCP-29 — Durable Idempotency Engine Middleware

## 1. Responsibility
- **Lead Domain**: Backend & Middleware Engineering
- **Assignee Lead**: Julian (Backend Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Implement reusable Express idempotency middleware backed by the PostgreSQL `idempotency_records` table, enforcing **DR-IDEM-001** via canonical payload hashing (SHA-256), in-flight lock protection, replay caching, and conflict rejection.

## 3. Why
Fulfills **DR-IDEM-001**. In physical retail environments, cashiers may experience network latency, accidental double-clicks, or terminal disconnects. Without durable idempotency, retried requests can cause duplicate inventory deductions, duplicate orders, and double charging.

## 4. Owner Profile
Senior Node.js Backend Engineer with deep expertise in database transaction semantics, cryptographic hashing, and high-reliability distributed systems patterns.

## 5. Preconditions
- `docs/engineering/client-01/06_IDEMPOTENCY_CONTRACT.md` reviewed and frozen.
- CCP-13 (Canonical Orders & Payment Ledger) completed.

## 6. Dependencies
- **Preceding Tickets**: CCP-13, CCP-44.
- **Downstream Blocking**: Blocks CCP-14 (POS Sales Backend API) and CCP-21 (POS Refund API).

## 7. Authoritative Contracts
- **DR-IDEM-001 (Idempotency Engine)**
- **DR-ERR-001 (Standard Error Envelope)**
- `docs/engineering/client-01/06_IDEMPOTENCY_CONTRACT.md`

## 8. Scope IN
- Middleware factory `createIdempotencyMiddleware(options)`.
- Canonical JSON serialization utility `canonicalizeJson` and SHA-256 hash generator.
- Database DDL migration `supabase/migrations/20260928000003_create_idempotency_records.sql`.
- Interception of outgoing Express responses (`res.json`, `res.send`) to capture and persist status and body.
- Handling duplicate replay requests by returning cached responses with header `X-Idempotent-Replay: true`.
- Detecting payload mutation conflicts and returning `409 IDEMPOTENCY_CONFLICT`.
- Handling in-progress locks and lock expiry timeouts.

## 9. Scope OUT
- In-memory Redis caching (explicitly excluded; durable PostgreSQL is required).
- Webhook idempotency for Stripe (managed independently in `stripe_events`).
- Frontend idempotency key generation (keys are generated in frontend hooks as UUIDv4).

## 10. Required Behavior
1. Extract key from `Idempotency-Key` header or `req.body.clientRequestId`. If missing on mutating routes, reject with `400 VALIDATION_ERROR`.
2. Compute SHA-256 hash of endpoint and normalized JSON payload.
3. Query `idempotency_records` using `SELECT ... FOR UPDATE`:
   - If key does not exist: insert row with `status = 'in_progress'` and proceed to next handler.
   - If key exists and `status = 'completed'`: compare hash. If matched, return cached status and body with `X-Idempotent-Replay: true`. If mismatched, return `409 IDEMPOTENCY_CONFLICT`.
   - If key exists and `status = 'in_progress'`: if lock is active ($< 60\text{s}$), return `409 IDEMPOTENCY_CONFLICT`. If lock expired, re-acquire and proceed.
4. On route completion, update row to `status = 'completed'` with final response code and body.

## 11. Inputs
- HTTP request headers and payload.
- Configuration options (lock timeout, expiration TTL).

## 12. Outputs
- Middleware passes request or short-circuits with cached/conflict response.
- Rows in `idempotency_records` table.

## 13. Allowed Implementation Freedom
- Response hijacking implementation pattern (wrapping `res.send` / `res.json`).
- Internal helper factoring under `src/middleware/idempotency/`.

## 14. Forbidden Changes
- DO NOT use transient in-memory storage (e.g. Map, NodeCache) as primary storage.
- DO NOT return HTTP 200 for payload hash mismatches.
- DO NOT cache responses that failed validation (`400 Bad Request`).

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/middleware/idempotency.ts`
  - `src/utils/crypto-helpers.ts`
  - `supabase/migrations/20260928000003_create_idempotency_records.sql`
  - `tests/unit/middleware/idempotency.test.ts`
- **Strictly Prohibited**:
  - Public storefront routes.

## 16. Data Impact
- Adds `idempotency_records` table.
- High-frequency write and read operations on idempotency records.

## 17. API Impact
- Attaches `X-Idempotent-Replay` header to replayed HTTP responses.

## 18. Security
- Key and payload hashing prevents replay tampering or session cross-talk.
- Automatic TTL pruning prevents unbounded database storage growth.

## 19. Concurrency & Idempotency
- Stored procedure or `FOR UPDATE` lock ensures only one request can process a given key concurrently.

## 20. Migration Considerations
- Standalone new table. Zero downtime impact.

## 21. Edge Cases
- Server crash mid-transaction: in-progress lock expires after 60 seconds, allowing client retry to execute cleanly.
- Large response body: JSONB column handles full order and receipt DTOs efficiently.

## 22. Observability
- Emits log events for cache hits (`idempotency.replay`), conflicts (`idempotency.conflict`), and lock acquisitions.

## 23. Acceptance Criteria
- [ ] First request executes and returns original response.
- [ ] Identical second request returns cached response with `X-Idempotent-Replay: true` without re-executing route handler.
- [ ] Second request with same key but modified payload returns `409 IDEMPOTENCY_CONFLICT`.
- [ ] In-flight parallel request returns `409 IDEMPOTENCY_CONFLICT`.

## 24. Test Strategy
- Vitest unit tests verifying JSON normalization, hash stability across key orderings, replay responses, and conflict scenarios.

## 25. Staging Validation
- Send duplicate curl requests with identical keys to staging; verify backend handler logs only 1 execution and returns cached body on second call.

## 26. Evidence Requirements
- Passing test logs (`npm test tests/unit/middleware/idempotency.test.ts`).
- Verification query showing persisted records in `idempotency_records`.

## 27. Definition of Done
- Middleware fully tested and integrated.
- Zero TypeScript diagnostics.
- Approved by Architecture Lead.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Julian (wire middleware into CCP-14 and CCP-21).
