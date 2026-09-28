# Execution Pack: CCP-33 — POS Sales E2E Integration Suite

## 1. Responsibility
- **Lead Domain**: QA Automation & Fullstack Integration
- **Assignee Lead**: QA Automation Lead
- **Secondary Reviewer**: Julian (Backend Lead) / Rogelio (Frontend Lead)

## 2. Objective
Author and verify automated Playwright end-to-end (E2E) integration test suites covering the complete Web POS sale lifecycle: cashier authentication, catalog search, barcode scanning, cart adjustments, cash tender change calculation, card reference submission, order persistence, inventory decrement, and receipt modal rendering.

## 3. Why
Unit and contract tests validate individual components in isolation, but only true browser-driven E2E automation verifies that the complete system functions reliably end-to-end. This test suite serves as the definitive automated release gate for POS sales.

## 4. Owner Profile
Senior QA Automation / Fullstack Engineer with expertise in Playwright, browser test fixtures, database seed/cleanup scripts, and CI/CD integration.

## 5. Preconditions
- CCP-14 (POS Sales Backend API), CCP-22 (Web POS Terminal UI), CCP-23 (POS Tender Modal), and CCP-24 (Receipt UI) completed and integrated.

## 6. Dependencies
- **Preceding Tickets**: CCP-14, CCP-22, CCP-23, CCP-24.
- **Downstream Blocking**: Blocks CCP-35 (Staging Deployment & Verification) and CCP-37 (Production Readiness Gate).

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority)**
- **DR-PAY-001 (Payment Ledger)**
- **DR-IDEM-001 (Idempotency Engine)**
- **DR-AUTH-001 (Authorization Model)**
- **DR-REC-001 (Receipt Read Model)**
- `docs/engineering/client-01/14_TEST_STRATEGY.md`

## 8. Scope IN
- Playwright test suite `tests/e2e/pos/pos-sales-lifecycle.spec.ts`.
- Database test fixture setup and teardown (`tests/fixtures/pos-fixtures.ts`).
- Verification scenarios:
  1. Cash Sale: search item, add to cart, input cash tender > total, verify change calculation, submit, verify receipt rendered, verify stock decremented in DB.
  2. Card Reference Sale: scan barcode, enter authorization code, submit, verify payment ledger row created with reference code.
  3. Role Protection: verify customer and unauthenticated sessions cannot reach POS UI.
  4. Out of Stock UI Handling: attempt sale when stock is 0, verify clean error modal.

## 9. Scope OUT
- Physical printer hardware testing.
- Manual exploratory testing (covered in staging acceptance).
- Refund E2E flows (handled in CCP-34).

## 10. Required Behavior
1. Run in headless Chromium, Firefox, and WebKit browsers.
2. Authenticate automatically via test staff account.
3. Assert DOM elements, modal appearances, and text labels.
4. Directly query database post-test to verify row state in `orders`, `order_items`, `sellable_units`, and `order_payments`.
5. Clean up seeded test records after test execution.

## 11. Inputs
- Playwright browser context, simulated mouse clicks, keyboard input.
- Test seed data in PostgreSQL.

## 12. Outputs
- Playwright test report, video/trace recordings on failure.
- Verifiable test evidence artifacts.

## 13. Allowed Implementation Freedom
- Page Object Model (POM) architecture under `tests/e2e/pages/PosPage.ts`.
- Selection of Playwright locator strategies (prefer `data-testid` and accessible role selectors).

## 14. Forbidden Changes
- DO NOT use flaky sleep timeouts (`page.waitForTimeout`); use deterministic assertions (`page.waitForSelector`, `toBeVisible`).
- DO NOT disable security checks to make tests pass.
- DO NOT leave orphaned test data in production databases.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `tests/e2e/pos/*`
  - `tests/fixtures/pos-fixtures.ts`
  - `playwright.config.ts`
- **Strictly Prohibited**:
  - Production application source code (`src/*`).

## 16. Data Impact
- Creates temporary test records in database, cleaned up via fixture hooks.

## 17. API Impact
- Exercises full API suite under `/api/pos/*`.

## 18. Security
- Test credentials stored securely in environment variables (`E2E_STAFF_EMAIL`, `E2E_STAFF_PASSWORD`).

## 19. Concurrency & Idempotency
- Tests run sequentially or in isolated worker databases to avoid cross-test data pollution.

## 20. Migration Considerations
- Operates on databases with CCP-12 and CCP-13 migrations applied.

## 21. Edge Cases
- Decimal rounding in tender calculation: asserts exact change matching.
- Slow network simulation: asserts UI disables submit button to prevent double-submit.

## 22. Observability
- Captures browser console logs and network traffic in Playwright trace files.

## 23. Acceptance Criteria
- [ ] 100% of tests in `pos-sales-lifecycle.spec.ts` pass consistently (3/3 runs green).
- [ ] Direct database query proves stock decreased by exact purchased quantity.
- [ ] Direct database query proves `order_payments` captures correct tender details.
- [ ] Execution completes within 60 seconds on CI runners.

## 24. Test Strategy
- Multi-browser Playwright execution in CI pipeline.

## 25. Staging Validation
- Execute the test suite against isolated staging deployment before promoting to production.

## 26. Evidence Requirements
- Playwright HTML test report summary.
- Trace file and screenshot artifact from successful run.

## 27. Definition of Done
- Test suite merged into `tests/e2e/`.
- Integrated into `validate-release.ps1` hard gate.
- Sign-off by QA Automation Lead.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: QA Lead (proceed to CCP-34 for Refund E2E Suite).
