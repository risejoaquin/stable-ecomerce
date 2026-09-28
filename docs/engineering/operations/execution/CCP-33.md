# Execution Pack: CCP-33 — POS Sales End-to-End Test Suite

**Ticket ID**: `CCP-33`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Role / Owner Profile**: QA Automation Lead / Playwright Engineer  
**Target Delivery**: Pre-Hardening / RC Hardening  
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)  

---

## 1. Objective, Context & Why

### Objective
Design, automate, and continuously execute the comprehensive End-to-End (E2E) browser and API test suite covering all Web POS sales workflows, validating cashier authentication, catalog search, barcode lookup, cart aggregation, cash tendering, external card reference recording, atomic inventory decrementing, and receipt generation.

### Why This Matters
Point of Sale is the core physical retail revenue stream for Client 01. A failure in POS sales directly impacts in-store retail checkout, causes inventory discrepancies with the online storefront, or results in unrecorded cash. Robust automated E2E tests guarantee that regressions in UI components or backend endpoints are caught before reaching store registers.

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

## 3. Scope Boundaries

- **IN SCOPE**:
  - Automated Playwright browser tests under `e2e/pos-sales.spec.ts`.
  - API integration tests under `tests/api/pos-sales.test.ts`.
  - Cash tender calculation and validation.
  - External card reference tender recording.
  - Server-authoritative price enforcement tests.
  - Role-based authorization tests (asserting `user` and `support` are denied).
  - Out-of-stock boundary condition tests.
- **EXPLICITLY OUT OF SCOPE**:
  - Physical receipt printer ESC/POS driver integration.
  - Payment terminal SDK or EMV chip-and-pin integration.
  - Offline local SQLite database storage.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: `CCP-14` (Web POS Sales API), `CCP-43` (Web POS Frontend UI), `CCP-16` (CI Infrastructure).
- **Downstream Dependents**: `CCP-34` (POS Refund & Restock), `CCP-35` (Staging Verification), `CCP-37` (Release Gate).
- **Preconditions**:
  - Playwright browser binaries installed (`npx playwright install chromium`).
  - Staging / local server listening on test port.
  - Seeded test SKUs (`SKU-POS-STANDARD-01`, `SKU-POS-LIMITED-01`).

---

## 5. Step-by-Step Implementation & Verification Guide

```
[Playwright Test Runner Starts]
               │
               ▼
[Step 1: Cashier Authentication Guard Test]
         Attempt POS access as guest / role:user -> Assert 403 Forbidden
         Authenticate as role:admin -> POS UI loads
               │
               ▼
[Step 2: Catalog Search & Barcode Lookup]
         Search "SKU-POS-STANDARD-01" -> Add 2 units to POS cart
         Assert cart subtotal reflects server price ($20 x 2 = $40)
               │
               ▼
[Step 3: Cash Tender Workflow Test]
         Select Cash Tender -> Input $50.00 cash tendered
         Assert change due calculates to exactly $10.00
         Click Finalize Sale -> Assert order created with status "paid"
               │
               ▼
[Step 4: Database State Verification]
         Query Supabase: sellable_units stock decremented by 2
         Query Supabase: order_payments contains 1 cash record ($40)
               │
               ▼
[Step 5: External Card Reference Workflow Test]
         Add item ($35.00) -> Select Card Reference Tender
         Input auth code "AUTH-88219" -> Finalize Sale
         Assert order_payments contains card_reference record; Stripe API not called
               │
               ▼
[Step 6: Idempotency Re-submission Test]
         Re-send identical client_request_id -> Returns identical order without re-decrementing stock
```

### Execution Commands:

1. **Run Full POS Playwright Suite Headlessly**:
   ```bash
   npx playwright test e2e/pos-sales.spec.ts --project=chromium
   ```

2. **Run POS Suite with Interactive UI**:
   ```bash
   npx playwright test e2e/pos-sales.spec.ts --ui
   ```

3. **Run API Integration Suite**:
   ```powershell
   npm test tests/api/pos-sales.test.ts
   ```

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Test Case | Description | Pass Threshold | Fail Threshold |
| :--- | :--- | :--- | :--- |
| **TC-POS-01** | Cash tender sale execution | HTTP 201; order `paid`; change accurate; stock -2 | HTTP != 201; incorrect change; stock unchanged |
| **TC-POS-02** | Card reference sale execution | HTTP 201; `channel: "card_reference"`; auth code stored | Missing card reference; Stripe error triggered |
| **TC-POS-03** | Server-authoritative pricing | Request submitting altered price is overwritten by server price | Sale finalized at tampered price |
| **TC-POS-04** | Auth guard enforcement | Non-admin receives HTTP 403 / `FORBIDDEN` | Non-admin can finalize sale |
| **TC-POS-05** | Idempotency replay | Same payload returns original order; stock decremented once | Second order created; double decrement |
| **TC-POS-06** | Out of stock rejection | Request for 0-stock SKU receives HTTP 409 `INSUFFICIENT_STOCK` | Sale succeeds; negative inventory |

---

## 7. Required Verifiable Evidence

1. **Playwright HTML Test Report**:
   Generated under `playwright-report/index.html` showing 100% green checks for `pos-sales.spec.ts`.
2. **Terminal Execution Log**:
   Pino structured log confirming receipt generation and atomic inventory decrement.
3. **Evidence Artifact**:
   Persisted under `pl20-evidence/pos-sales-e2e.json`.

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] 100% of Playwright POS test cases pass consistently across 5 consecutive runs.
- [ ] Cash tendering, change calculation, and card reference recording proven deterministic.
- [ ] Row-level inventory locking verified under race condition tests.
- [ ] Zero security or auth bypass vulnerabilities.
- [ ] Test suite integrated into CI E2E workflow stage.

### Escalation Pathway:
- If Playwright tests detect race conditions or inventory leakage, escalate to Backend Lead (Rogelio).
- If UI locators break due to component refactoring, escalate to Frontend Lead.
