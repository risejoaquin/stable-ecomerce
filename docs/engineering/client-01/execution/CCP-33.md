# Execution Pack: CCP-33 — Critical Path E2E Automation — Playwright Suite (Storefront + POS + Inventory Exception Path)

## 1. Responsibility
- **Lead Domain**: QA Automation & Integrated E2E Engineering
- **Assignee Lead**: QA Automation Lead / Playwright Engineer
- **Secondary Reviewers**: Rogelio (Backend / Database Lead) & Julian (Frontend Lead)
- **Technical & Release Authority**: Joaquin (@risejoaquin)

## 2. Objective
Design, automate, and continuously execute the authoritative End-to-End (E2E) browser and API test suite covering the critical revenue journeys of Client 01: customer storefront purchase via Stripe, Web POS cash sale with change calculation, Web POS card reference recording, shared inventory deduction, atomic concurrency collision handling, and receipt generation.

## 3. Why
Unit and contract tests validate individual components in isolation, but only true browser-driven E2E automation verifies that the complete integrated system functions reliably across real user journeys. This Playwright suite serves as the definitive automated release gate for `CCP-35` (Feature Freeze) and `CCP-38` (Production Deployment).

## 4. Owner Profile
Senior QA Automation / Fullstack Engineer with deep expertise in Playwright browser automation, Page Object Model (POM), synthetic test fixtures, database state assertions, and CI headless runner optimization.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- Web POS Sale API (CCP-14) and Web POS Register UI (CCP-43) operational.
- Storefront Checkout Flow (CCP-15) and Stock Guards (CCP-29) operational.
- Receipt Read Model (CCP-27) and Transactional Email Queue (CCP-23) operational.

## 6. Dependencies
- **Preceding Tickets**: CCP-12, CCP-13, CCP-14, CCP-15, CCP-22, CCP-23, CCP-27, CCP-29, CCP-43.
- **Downstream Blocking**: Blocks CCP-34 (Pre-Freeze System Validation), CCP-35 (Feature Freeze Enforcement), and CCP-37 (Client UAT Walkthrough).

## 7. Authoritative Contracts
- **DR-INV-001 (Canonical Inventory Authority — Row Lock Decrements)**
- **DR-PAY-001 (Order Payments Ledger & Multi-Channel Tender)**
- **DR-IDEM-001 (PostgreSQL Durable Idempotency)**
- **DR-AUTH-001 (Web POS Operator RBAC & Route Protection)**
- **DR-ERR-001 (Canonical Error Envelope)**
- **DR-REC-001 (Deterministic Receipt Read Model)**
- `docs/engineering/client-01/14_TEST_STRATEGY.md`
- `docs/engineering/operations/QA_STRATEGY.md`

## 8. Scope IN
- Authoring canonical Playwright test suite adhering to repository `playwright.config.ts`:
  - Path: `e2e/pos-sales.spec.ts` (Playwright E2E browser tests).
  - Path: `tests/api/pos-sales.test.ts` (Supertest API integration suite).
- Four Mandatory Critical Journeys:
  1. **Journey 1: Online Storefront Purchase**: Customer selects SellableUnit, completes Stripe test checkout, confirms order row in `orders` and stock decrement in `sellable_units`.
  2. **Journey 2: Web POS Cash Sale**: Cashier logs in, scans barcode, tenders cash ($500 for $450 sale), verifies change due ($50), finalizes sale, asserts receipt modal renders, and confirms cash ledger row in `order_payments`.
  3. **Journey 3: Web POS Card Reference Sale**: Cashier scans item, selects card tender, inputs terminal authorization code ("AUTH-4412"), finalizes sale, asserts receipt with card slip reference.
  4. **Journey 4: Shared Inventory Concurrency Collision**: Online customer and POS cashier simultaneously attempt to purchase the final remaining unit of a SellableUnit; asserts that exactly one transaction succeeds, one transaction receives clean `INSUFFICIENT_STOCK` rejection, and database stock reaches exactly 0 with zero negative inventory.
- Verification of staff RBAC: unauthenticated and `user` role sessions rejected from `/pos`.
- Test fixtures setup and teardown (`tests/fixtures/pos-fixtures.ts`).

## 9. Scope OUT
- Physical receipt printer ESC/POS driver integration (browser print dialog mocked).
- Payment terminal EMV hardware chip-and-pin integration.
- Refund and compensating return workflows (handled in CCP-34).

## 10. Required Behavior
1. Tests execute in headless Chromium via `npm run test:e2e` matching `playwright.config.ts`.
2. Tests seed isolated test products and SellableUnits prior to execution and clean up records on teardown.
3. Assertions verify DOM elements, modal appearances, button states, and direct database rows in PostgreSQL (`orders`, `order_payments`, `sellable_units`, `inventory_movements`).
4. Concurrency test fires simultaneous requests and asserts that final inventory is non-negative ($S \ge 0$).
5. Flaky tests or retry-based masking are strictly prohibited; failures must produce actionable trace artifacts.

## 11. Inputs
- Playwright browser context, simulated mouse clicks, keyboard input, synthetic test user credentials.
- Test seed data in Supabase PostgreSQL staging/test instance.

## 12. Outputs
- Playwright HTML test report (`playwright-report/`).
- Video and trace recordings on test failure (`test-results/`).
- Verifiable test evidence logs.

## 13. Allowed Implementation Freedom
- Page Object Model internal method naming in `e2e/pages/PosPage.ts`.
- Selection of synthetic test item names and SKU codes.

## 14. Forbidden Changes
- DO NOT place Playwright tests in non-standard directories (must reside under `e2e/` per `playwright.config.ts`).
- DO NOT bypass authentication guards or mock away database row locks.
- DO NOT allow test suites to leave dirty seed data in the database.
- DO NOT weaken assertions or use arbitrary `sleep` timeouts instead of explicit locator awaits.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `e2e/pos-sales.spec.ts`
  - `e2e/pages/PosPage.ts`
  - `tests/api/pos-sales.test.ts`
  - `tests/fixtures/pos-fixtures.ts`
- **Strictly Prohibited**:
  - Product application code or database schema migrations.

## 16. Data Impact
- Creates temporary test records in `orders`, `order_payments`, `sellable_units`, and `inventory_movements`; purged after test suite completion.

## 17. API Impact
- Exercises `POST /api/pos/sales`, `POST /api/checkout`, `GET /api/inventory/availability`, and `GET /api/pos/orders`.

## 18. Security
- Validates that non-staff credentials cannot access POS routes.
- Confirms zero exposure of secrets or API keys in test traces.

## 19. Concurrency & Idempotency
- Validates that concurrent sale submissions with identical `clientRequestId` return the same order without double-decrementing stock.
- Validates that concurrent requests for the final unit are safely serialized by `FOR UPDATE` row locks.

## 20. Migration Considerations
- None. Operates directly on the consolidated Client 01 code baseline.

## 21. Edge Cases
- Exact tender amount ($450 tendered for $450 total): change due displays $0.00 cleanly.
- Rapid barcode input simulating 50ms USB scanner: correctly populates cart without dropping characters.

## 22. Observability
- All Playwright runs generate structured traces on failure, enabling visual step-by-step triage.

## 23. Acceptance Criteria
- [ ] Automated Playwright suite `e2e/pos-sales.spec.ts` passes with 0 failures in headless CI.
- [ ] API integration suite `tests/api/pos-sales.test.ts` passes with 0 failures.
- [ ] Storefront Stripe purchase, POS Cash sale, and POS Card Reference sale validated end-to-end.
- [ ] Concurrency test proves zero overselling and zero negative stock under race conditions.
- [ ] Direct database assertions confirm correct records in `orders`, `order_payments`, and `sellable_units`.
- [ ] Unauthorized roles (`user`, anonymous) verified blocked from accessing POS.

## 24. Test Strategy
- Execute local Playwright suite:
  ```bash
  npx playwright test e2e/pos-sales.spec.ts --project=chromium
  ```
- Execute API integration suite:
  ```bash
  npm test tests/api/pos-sales.test.ts
  ```

## 25. Staging Validation
- Run Playwright test suite against live Railway staging URL (`STAGING_BASE_URL=https://staging.domain.com npx playwright test e2e/pos-sales.spec.ts`).

## 26. Evidence Requirements
- Playwright summary log showing all tests passing.
- Database query transcript proving clean cleanup and accurate transactional row creation.

## 27. Definition of Done
- All 4 critical journeys automated and passing.
- Code reviewed and approved by Backend Lead (Rogelio), Frontend Lead (Julian), and Technical Authority (Joaquin).
- Mandatory release gate for Feature Freeze (CCP-35).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: QA Lead (proceed to CCP-34 Pre-Freeze System Validation) and Joaquin (CCP-35 Feature Freeze).
