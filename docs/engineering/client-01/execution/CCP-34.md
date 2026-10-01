# Execution Pack: CCP-34 — Pre-Freeze System Validation — Compensating Workflow, Role Isolation & Payment Edge Cases

## 1. Responsibility
- **Lead Domain**: QA Engineering & Pre-Freeze Validation
- **Assignee Lead**: QA Automation Lead / System Validation Engineer
- **Secondary Reviewers**: Rogelio (Backend / Database Lead) & Julian (Frontend Lead)
- **Technical & Release Authority**: Joaquin (@risejoaquin)

## 2. Objective
Execute the comprehensive pre-freeze system validation suite validating role isolation, POS payment-channel integrity (cash and card reference), idempotency guards, concurrent inventory exhaustion boundaries, the online `inventory_exception` compensating workflow, and channel-specific refund restock restitution, verifying that zero invariant violations or secret leaks exist prior to declaring Feature Freeze (`CCP-35`).

## 3. Why
Fulfills **DR-INV-001**, **DR-PAY-001**, **DR-IDEM-001**, **DR-AUTH-001**, and **DR-ERR-001**. Before freezing the codebase on **03 Oct 2026**, the platform must undergo rigorous adversarial and edge-case testing. Validating that cash sales never generate fake Stripe IDs, that refund restitution restores exact discrete SellableUnits without touching Stripe, and that unauthorized roles cannot bypass security guards ensures commercial stability and financial integrity.

## 4. Owner Profile
Lead System Validation / QA Engineer with expertise in edge-case testing, financial transaction validation, adversarial security testing, and automated Playwright execution.

## 5. Preconditions
- Critical Path E2E Automation (CCP-33) passing.
- POS Refund & Restock API (CCP-28) operational.
- Security hardening tickets CCP-17, CCP-18, CCP-19 verified.
- Frozen contracts `DR-INV-001` through `DR-REC-001` active.

## 6. Dependencies
- **Preceding Tickets**: CCP-19, CCP-22, CCP-28, CCP-33.
- **Downstream Blocking**: Blocks CCP-35 (Feature Freeze Enforcement) and CCP-36 (Hardening Window).

## 7. Authoritative Contracts
- **DR-PAY-001 (Channel-Aware Payment & Refund Invariants)**
- **DR-INV-001 (Canonical Inventory Authority — Exact Unit Restock)**
- **DR-IDEM-001 (PostgreSQL Durable Idempotency)**
- **DR-AUTH-001 (Web POS Operator RBAC & Route Protection)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/operations/CI_QUALITY_GATES.md`

## 8. Scope IN
- Automated E2E test suite under `e2e/pos-refund-restock.spec.ts` (Playwright).
- Automated API test suite under `tests/api/pos-refund.test.ts` (Supertest).
- Mandatory Validation Matrix:
  1. **POS Role Boundaries**: Verifies users with role `user` and `support` cannot access `/pos` or submit sales/refunds.
  2. **Payment Channel Correctness**: Verifies cash and card-reference sales never create dummy or synthetic Stripe IDs in `order_payments`.
  3. **Duplicate Submission Idempotency**: Verifies that retrying sale or refund requests with identical `clientRequestId` returns cached response without duplicate inventory decrement or double refund.
  4. **Inventory Race Boundary**: Verifies that 10 simultaneous requests for the last remaining SellableUnit result in exactly 1 success and 9 clean rejections with zero negative inventory.
  5. **Compensating Workflow**: Verifies that an online payment encountering an inventory race transitions to `inventory_exception` without silent errors.
  6. **Refund Restitution**: Verifies that refunding a POS order restores the exact discrete `sellable_units` sold and records a cash reversal in `order_payments` without calling Stripe.
  7. **Repository Secret Scan**: Execution of `scan-local-secrets.ps1` confirming zero exposed credentials.

## 9. Scope OUT
- Redesigning or mutating frozen contracts (this issue is a validation gate, not a redesign).
- Production deployment (handled in CCP-38).
- Performance load testing at scale (handled in CCP-36).

## 10. Required Behavior
1. All automated checks must execute in headless CI environment.
2. If any test scenario detects an unexpected call to the Stripe SDK during a cash transaction or cash refund, the test suite must immediately fail with a critical financial invariant error.
3. If an inventory decrement results in `stock < 0`, the test suite fails immediately.
4. Secret scan must verify zero uncommitted or committed private keys, JWT secrets, or production tokens.
5. All findings must reference the authoritative frozen contracts.

## 11. Inputs
- Automated Playwright and Supertest test fixtures.
- Test database seeded with multi-channel order and refund scenarios.

## 12. Outputs
- Validation test report and JUnit XML test artifacts.
- Playwright trace recordings for any encountered discrepancies.
- Formal Pre-Freeze System Validation Certificate.

## 13. Allowed Implementation Freedom
- Internal test assertion structuring and synthetic data generators.
- Custom assertions for database ledger consistency.

## 14. Forbidden Changes
- DO NOT weaken test assertions or skip edge cases to achieve a pass.
- DO NOT alter frozen architectural contracts during validation.
- DO NOT permit retry loops that mask transient concurrency race conditions.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `e2e/pos-refund-restock.spec.ts`
  - `tests/api/pos-refund.test.ts`
  - `tests/fixtures/refund-fixtures.ts`
- **Strictly Prohibited**:
  - Modifying product source code in `src/` or backend handlers in `server.ts`.

## 16. Data Impact
- Creates and purges test orders and payment records in test database.

## 17. API Impact
- Validates `POST /api/pos/orders/:id/refund`, `POST /api/pos/sales`, and `/api/checkout`.

## 18. Security
- Validates role boundaries (`DR-AUTH-001`).
- Runs automated local secret scanner against entire repository.

## 19. Concurrency & Idempotency
- Stresses concurrency row locks under race condition tests.
- Proves idempotency keys prevent duplicate side-effects.

## 20. Migration Considerations
- Validates backward compatibility of existing orders with new refund handlers.

## 21. Edge Cases
- Order with multiple different SellableUnits: refunding 1 unit restores only that specific SKU.
- Refunding an already refunded order: returns HTTP 409 or cached refund receipt with zero stock mutation.

## 22. Observability
- Emits detailed test run evidence logs and records all assertion states.

## 23. Acceptance Criteria
- [ ] Unauthorized users cannot access or submit POS sales or refunds.
- [ ] Cash and card-reference transactions NEVER create fake or real Stripe IDs.
- [ ] Duplicate POS retries do not duplicate order, payment, or inventory effects.
- [ ] Concurrent inventory races never produce negative SellableUnit stock ($S \ge 0$).
- [ ] Refund restitution references exact SellableUnits from order items and increments stock once.
- [ ] Existing Stripe refund behavior is not reused for non-Stripe payments.
- [ ] Secret scanner `scripts/qa/security/scan-local-secrets.ps1` passes with 0 findings.
- [ ] Automated suites `e2e/pos-refund-restock.spec.ts` and `tests/api/pos-refund.test.ts` pass 100%.

## 24. Test Strategy
- Execute local Playwright refund and restock suite:
  ```bash
  npx playwright test e2e/pos-refund-restock.spec.ts --project=chromium
  ```
- Execute API refund integration suite:
  ```bash
  npm test tests/api/pos-refund.test.ts
  ```
- Run secret scanner:
  ```powershell
  .\scripts\qa\security\scan-local-secrets.ps1
  ```

## 25. Staging Validation
- Execute the full pre-freeze validation checklist against Railway staging; assert 100% compliance across all 7 test categories.

## 26. Evidence Requirements
- Playwright and Vitest terminal transcripts showing 100% green assertions.
- Secret scanner log showing 0 exposed credentials.

## 27. Definition of Done
- All pre-freeze scenarios validated without defects.
- Review signed off by Lead QA Engineer, Backend Lead (Rogelio), and Technical Authority (Joaquin).
- Pre-Freeze gate closed, unblocking Feature Freeze (`CCP-35`).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Joaquin (proceed to CCP-35 Feature Freeze & RC Tag Cut).
