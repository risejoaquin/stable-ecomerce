# Execution Pack: CCP-14 — POS Sales Backend API Implementation

## 1. Responsibility
- **Lead Domain**: Backend API Engineering
- **Assignee Lead**: Julian (Backend Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Implement the authoritative `POST /api/pos/sales` endpoint in Express, fulfilling the 11-step transaction sequence: authenticating staff, validating payloads, resolving server-authoritative pricing, executing atomic stock decrements, persisting canonical orders and payments, and returning the receipt read model.

## 3. Why
This endpoint is the core operational backend interface for Web POS sales. It enables physical store checkouts while guaranteeing that in-store sales immediately decrement canonical inventory, eliminating overselling with online customers.

## 4. Owner Profile
Senior Node.js / Express Backend Engineer with deep expertise in transactional API design, PostgreSQL client operations, schema validation via Zod, and defensive security practices.

## 5. Preconditions
- CCP-12 (Inventory & SKU Schema Migrations) completed.
- CCP-13 (Canonical Orders & Payment Ledger) completed.
- CCP-28 (Auth & Security Middleware) and CCP-29 (Idempotency Engine) available or coordinated.
- `docs/engineering/client-01/09_POS_API_CONTRACT.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-12, CCP-13, CCP-28, CCP-29.
- **Downstream Blocking**: Blocks CCP-22 (Web POS Terminal UI) and CCP-33 (POS Sales E2E Suite).

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority)**
- **DR-PAY-001 (Payment Ledger)**
- **DR-IDEM-001 (Idempotency Engine)**
- **DR-AUTH-001 (Authorization Model)**
- **DR-ERR-001 (Standard Error Envelope)**
- **DR-REC-001 (Receipt Read Model)**
- `docs/engineering/client-01/09_POS_API_CONTRACT.md`

## 8. Scope IN
- Implementation of route handler for `POST /api/pos/sales` in Express.
- Zod request validation schema `PosSalePayloadSchema`.
- Server-side price resolution from `sellable_units` (Zero-trust frontend pricing).
- Transactional invocation of `decrement_sellable_unit_stock` RPC.
- Transactional insertion of canonical `orders`, `order_items`, and `order_payments`.
- Generation of deterministic receipt DTO in response payload.
- Error handling integration conforming to DR-ERR-001.

## 9. Scope OUT
- Web POS frontend UI (handled in CCP-22).
- POS catalog search endpoints (handled in CCP-15).
- Refund operations (handled in CCP-21).

## 10. Required Behavior
1. Enforce `requirePosOperator` middleware (`owner` or `admin` only).
2. Validate payload: `clientRequestId` (UUID), non-empty `items`, valid `payment`.
3. Disregard any client-supplied item prices or subtotals.
4. Execute stock deduction inside transaction. If stock is insufficient, return `409 INSUFFICIENT_STOCK`.
5. Persist order with `channel = 'pos_register'`, `status = 'pagado'`, and `cashier_user_id = req.user.id`.
6. Persist payment row with `status = 'captured'`. If cash, record `amountTendered` and `changeGiven`.
7. Return `HTTP 201 Created` with full order and receipt DTO.

## 11. Inputs
- HTTP request: Headers (Authorization, X-Request-Id), JSON body (`clientRequestId`, `items`, `payment`, `terminalId`, `notes`).

## 12. Outputs
- HTTP response: Status `201 Created`, JSON body containing `order` and `receipt` models.
- Database: 1 row in `orders`, $N$ rows in `order_items`, 1 row in `order_payments`, $N$ rows in `inventory_movements`, 1 row in `audit_logs`.

## 13. Allowed Implementation Freedom
- Modularization of helper functions across `src/controllers/pos-controller.ts` and `src/services/pos-service.ts`.
- Structure of unit/contract test fixtures.

## 14. Forbidden Changes
- NEVER accept or trust price inputs from the client.
- DO NOT bypass the atomic stock decrement RPC.
- DO NOT execute non-transactional database operations.
- DO NOT invent a new role for cashier.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/routes/pos-routes.ts`
  - `src/controllers/pos-controller.ts`
  - `src/services/pos-service.ts`
  - `src/schemas/pos-schemas.ts`
  - `server.ts` (Mounting route `/api/pos`)
  - `tests/api/pos-sales.test.ts`
- **Strictly Prohibited**:
  - Frontend components under `src/pages/*` or `src/components/*`.

## 16. Data Impact
- High volume transactional inserts into `orders`, `order_items`, `order_payments`, and `inventory_movements`.

## 17. API Impact
- Exposes new endpoint `POST /api/pos/sales`. Zero impact on existing public storefront routes.

## 18. Security
- Role-based authorization (`requirePosOperator`).
- Complete input sanitization and Zod parsing.
- Zero-trust pricing: prices fetched strictly from database.

## 19. Concurrency & Idempotency
- Uses `IdempotencyMiddleware` (CCP-29) keyed on `clientRequestId`.
- Prevents double charging or duplicate order creation during network timeouts.

## 20. Migration Considerations
- Supports dual-write environment via database triggers created in CCP-12.

## 21. Edge Cases
- Exact cash payment: `amountTendered === total`, `changeGiven === 0`.
- Oversold race condition: Returns clean `409 INSUFFICIENT_STOCK` detailing deficit item.
- Network dropped after DB commit: Client retries with same `clientRequestId`, receives cached `201 Created` response.

## 22. Observability
- Emits structured JSON logs via `pino` with fields: `requestId`, `cashierUserId`, `orderId`, `total`, `channel`.
- Emits audit log to `audit_logs` table.

## 23. Acceptance Criteria
- [ ] Endpoint rejects unauthenticated calls with `401 AUTH_REQUIRED`.
- [ ] Endpoint rejects `user` and `support` roles with `403 FORBIDDEN`.
- [ ] Submitting client price overrides does not alter settled order price.
- [ ] Cash payment computes exact change correctly.
- [ ] Card reference payment persists `referenceCode` in payment ledger.
- [ ] Replay with same `clientRequestId` returns identical response with `X-Idempotent-Replay: true`.
- [ ] High-contention race conditions abort cleanly with `409 INSUFFICIENT_STOCK`.

## 24. Test Strategy
- Supertest contract tests verifying role enforcement, input validation, cash change math, and error envelopes.

## 25. Staging Validation
- Execute curl/Postman sale creation against staging backend using valid staff JWT. Verify database row creation.

## 26. Evidence Requirements
- Passing Supertest log output (`npm test tests/api/pos-sales.test.ts`).
- Response JSON sample verifying order and receipt structure.

## 27. Definition of Done
- All acceptance criteria verified by tests.
- Code reviewed by Architecture Lead.
- Ready for integration with Web POS UI (CCP-22).

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Rogelio (consume endpoint in Web POS Terminal UI CCP-22).
