# Execution Pack: CCP-34 — POS Refund & Restock E2E Suite

## 1. Responsibility
- **Lead Domain**: QA Automation & Backend Verification
- **Assignee Lead**: QA Automation Lead
- **Secondary Reviewer**: Julian (Backend Lead)

## 2. Objective
Author and verify automated Playwright and API integration test suites validating the complete refund, restock, idempotency conflict, and payment reconciliation lifecycles across cash, card reference, and Stripe sales.

## 3. Why
Fulfills **DR-REF-001** and **DR-IDEM-001** verification standards. Refunds and stock returns involve complex financial and inventory state transitions. Automated E2E verification ensures that restocking restores inventory to the exact `SellableUnit` and that cash/card transactions never attempt external Stripe calls.

## 4. Owner Profile
Senior QA Automation / Backend Test Engineer with deep knowledge of Stripe mock fixtures, PostgreSQL data assertions, and edge-case testing.

## 5. Preconditions
- CCP-21 (POS Refund & Restock API) completed.
- CCP-24 (Receipt View & Print Action) completed.
- `docs/engineering/client-01/10_REFUND_CONTRACT.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-21, CCP-24, CCP-33.
- **Downstream Blocking**: Blocks CCP-35 (Staging Verification Gate) and CCP-37 (Production Readiness Gate).

## 7. Authoritative Contracts
- **DR-REF-001 (Refund & Restock Rules)**
- **DR-INV-001 (Inventory Authority)**
- **DR-PAY-001 (Payment Ledger)**
- **DR-IDEM-001 (Idempotency Engine)**
- `docs/engineering/client-01/10_REFUND_CONTRACT.md`
- `docs/engineering/client-01/14_TEST_STRATEGY.md`

## 8. Scope IN
- Test suite `tests/e2e/pos/pos-refund-restock.spec.ts`.
- Scenarios:
  1. Cash Order Full Return: refund 100% of cash sale, verify order transitions to `'refunded'`, verify exact items restocked in `sellable_units`, verify audit log created.
  2. Cash Order Partial Return: return 1 of 2 items, verify order transitions to `'partially_refunded'`, verify only returned item restocked, verify remaining balance unchanged.
  3. Card Reference Return: return card sale, verify manual reference recorded, verify no Stripe API calls made.
  4. Idempotency Conflict & Replay: replay identical refund payload (cached result returned); replay with modified amount (HTTP 409 conflict returned).
  5. Excessive Refund Attempt: attempt refunding more than captured order total, verify HTTP `422 REFUND_NOT_ALLOWED`.

## 9. Scope OUT
- Stripe physical chargeback / dispute disputes testing.
- Hardware cash drawer auto-kick triggers.

## 10. Required Behavior
1. Run in CI automation pipeline.
2. Directly assert database state before and after each refund scenario.
3. Intercept and monitor external HTTP requests to guarantee **zero calls to Stripe API** during cash and card reference refund tests.
4. Clean up seeded data after execution.

## 11. Inputs
- HTTP requests to `/api/pos/orders/:id/refund`.
- Database fixtures for completed sales.

## 12. Outputs
- Verifiable test execution report.
- Trace logs detailing database row states.

## 13. Allowed Implementation Freedom
- Test data builder pattern in `tests/helpers/order-builders.ts`.
- Helper utilities for verifying stock and payment reconciliation.

## 14. Forbidden Changes
- DO NOT allow any test scenario to call live Stripe API keys.
- DO NOT bypass the PostgreSQL `execute_order_refund` stored procedure.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `tests/e2e/pos/pos-refund-restock.spec.ts`
  - `tests/helpers/order-builders.ts`
  - `tests/helpers/reconciliation-helpers.ts`
- **Strictly Prohibited**:
  - Production code under `src/*`.

## 16. Data Impact
- Creates, mutates, and deletes test orders in test database.

## 17. API Impact
- Exercises `POST /api/pos/orders/:id/refund` and `GET /api/pos/orders/:id/receipt`.

## 18. Security
- Verifies authorization: unprivileged user attempts to refund must receive `403 FORBIDDEN`.

## 19. Concurrency & Idempotency
- Validates that concurrent refund requests for the same order do not exceed captured payment amount.

## 20. Migration Considerations
- Tests both orders created via POS and orders created via online storefront.

## 21. Edge Cases
- Item returned with `restock: false`: financial refund recorded, stock remains unchanged.
- Re-refunding already fully refunded order: returns `409 ORDER_STATE_CONFLICT`.

## 22. Observability
- Asserts that every refund creates an entry in `audit_logs` with actor user ID and refund reason.

## 23. Acceptance Criteria
- [ ] 100% of refund test scenarios pass cleanly.
- [ ] Direct database query proves `sellable_units.stock` accurately incremented.
- [ ] Assertion confirms zero outbound HTTP requests made to Stripe API for cash/card returns.
- [ ] Idempotency tests prove duplicate replays are safe and payload tampering is rejected.
- [ ] Excessive refund requests fail with 422.

## 24. Test Strategy
- Integration and E2E test execution with Supertest and Playwright.

## 25. Staging Validation
- Execute the refund test suite against staging database before release sign-off.

## 26. Evidence Requirements
- Passing test runner log output (`npm test tests/e2e/pos/pos-refund-restock.spec.ts`).
- Detailed SQL state assertion logs.

## 27. Definition of Done
- Test suite passing in CI.
- Code reviewed and approved by QA Lead and Backend Lead.
- Ready for CCP-35 Staging Verification.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Release Manager (proceed to CCP-35 for Staging Deployment).
