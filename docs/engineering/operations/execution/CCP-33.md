# Execution Pack: CCP-33 — POS Sales End-to-End Test Suite (Operations & QA Runbook Supplement)

> [!IMPORTANT]
> **Canonical Implementation Authority**: This document serves as the operational QA and CI runbook supplement. The single authoritative implementation execution pack for this Jira ticket is:
> [`docs/engineering/client-01/execution/CCP-33.md`](../../client-01/execution/CCP-33.md)

**Ticket ID**: `CCP-33`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Role / Owner Profile**: QA Automation Lead / Playwright Engineer  
**Secondary Reviewers**: Rogelio (Backend Lead) & Julian (Frontend Lead)  
**Technical & Release Authority**: Joaquin (@risejoaquin)  
**Target Delivery**: Pre-Hardening / RC Hardening (03 Oct 2026)  
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)  

---

## 1. Objective, Context & Why

### Objective
Execute and maintain the comprehensive End-to-End (E2E) browser and API test suite covering all Web POS sales workflows, validating cashier authentication, catalog search, barcode lookup, cart aggregation, cash tendering with change calculation, external card reference recording, atomic inventory decrementing, and receipt generation.

### Why This Matters
Point of Sale is the core physical retail revenue stream for Client 01. Robust automated E2E tests guarantee that regressions in UI components or backend endpoints are caught in CI before reaching physical store registers, protecting both revenue and inventory alignment.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Web POS operates in standard desktop and tablet browsers (Chromium / WebKit).
   - Cash transactions must accept amount tendered, compute exact change due, and finalize without external gateway calls.
   - External card reference transactions must capture authorization reference code and record in ledger.
   - Frontend price tampering must be rejected; server is 100% authoritative for pricing and discounts.

2. **FROZEN CONTRACT**:
   - `DR-INV-001`: POS sales decrement exact `SellableUnit` stock atomically via row locks.
   - `DR-PAY-001`: Every sale creates exactly one `order_payments` record with immutable status.
   - `DR-AUTH-001`: Only authenticated users with role `admin` or `owner` can finalize sales.
   - `DR-ERR-001`: API errors return canonical envelope.
   - `DR-IDEM-001`: Duplicate `client_request_id` returns cached original order.

3. **DERIVED ENGINEERING DESIGN**:
   - Playwright test architecture using Page Object Model (`PosPage.ts`).
   - Synthetic test store and SKU fixtures.
   - Zero-inventory boundary tests and concurrency lock tests.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Test data attributes: `data-testid="pos-tender-cash"`, `data-testid="pos-finalize-btn"`.

---

## 3. Scope Boundaries & Test Paths

- **CANONICAL TEST PATHS**:
  - Automated Playwright browser tests: `e2e/pos-sales.spec.ts` (configured via root `playwright.config.ts`).
  - Automated API integration tests: `tests/api/pos-sales.test.ts`.
- **IN SCOPE**:
  - Cash tender calculation and validation.
  - External card reference tender recording.
  - Server-authoritative price enforcement tests.
  - Role-based authorization tests (asserting `user` and `support` are denied).
  - Out-of-stock boundary condition tests and shared inventory concurrency.
- **EXPLICITLY OUT OF SCOPE**:
  - Physical receipt printer ESC/POS driver integration.
  - Payment terminal SDK or EMV chip-and-pin integration.
  - Refund flows (handled in CCP-34).

---

## 4. Operational Execution Procedure

1. **Local Test Execution**:
   ```bash
   # Run Playwright E2E suite in headless Chromium
   npx playwright test e2e/pos-sales.spec.ts --project=chromium

   # Run API integration tests
   npm test tests/api/pos-sales.test.ts
   ```

2. **CI Pipeline Integration**:
   Executed as a mandatory step in the `validate-release.ps1` pipeline. Any failure blocks PR merge into `main`.

3. **Staging Verification**:
   Executed against Railway staging environment with live Supabase database connections to verify end-to-end network latency and row lock performance.

---

## 5. Acceptance Criteria Reconciliation

Matches canonical pack `docs/engineering/client-01/execution/CCP-33.md`:
- [ ] Automated Playwright suite `e2e/pos-sales.spec.ts` passes with 0 failures in headless CI.
- [ ] API integration suite `tests/api/pos-sales.test.ts` passes with 0 failures.
- [ ] Storefront Stripe purchase, POS Cash sale, and POS Card Reference sale validated end-to-end.
- [ ] Concurrency test proves zero overselling and zero negative stock under race conditions.
- [ ] Direct database assertions confirm correct records in `orders`, `order_payments`, and `sellable_units`.
- [ ] Unauthorized roles (`user`, anonymous) verified blocked from accessing POS.

---

## 6. Definition of Done & Escalation

- **Definition of Done**: 100% test pass rate in CI, zero flaky tests, signed off by QA Automation Lead and Technical Authority.
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: CCP-34 (Pre-Freeze System Validation) and CCP-35 (Feature Freeze).
