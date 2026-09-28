# Execution Pack: CCP-34 — POS Refund, Restock & Receipt E2E Test Suite (Operations & QA Runbook Supplement)

> [!IMPORTANT]
> **Canonical Implementation Authority**: This document serves as the operational QA and CI runbook supplement. The single authoritative implementation execution pack for this Jira ticket is:
> [`docs/engineering/client-01/execution/CCP-34.md`](../../client-01/execution/CCP-34.md)

**Ticket ID**: `CCP-34`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Role / Owner Profile**: QA Automation Lead / System Validation Engineer  
**Secondary Reviewers**: Rogelio (Backend Lead) & Julian (Frontend Lead)  
**Technical & Release Authority**: Joaquin (@risejoaquin)  
**Target Delivery**: Pre-Hardening / RC Hardening (03 Oct 2026)  
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)  

---

## 1. Objective, Context & Why

### Objective
Execute and maintain the comprehensive end-to-end automated validation suite covering Web POS returns, refund processing across multiple payment channels (`cash`, `card_reference`, `stripe`), idempotent inventory restocking, secret scanning, and receipt read model rendering (`DR-REC-001`).

### Why This Matters
Returns and refunds represent high-risk financial and inventory operations. Issuing a cash refund must never invoke the Stripe refund API. Restocking must restore the exact discrete SellableUnits sold. CCP-34 operationalizes the automated verification of these rules as a mandatory pre-freeze gate.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - The original payment channel dictates refund execution:
     - Cash sale refunds MUST be processed as cash; never call Stripe.
     - Card reference refunds MUST be recorded as external card credits; never call Stripe.
     - Stripe online orders refunded via admin may dispatch Stripe refund API calls.
   - Cumulative refunds for an order must never exceed the total paid amount.
   - Restocked items must update the exact `SellableUnit` and emit an `inventory_movements` record.

2. **FROZEN CONTRACT**:
   - `DR-INV-001`: Restocking increments `SellableUnit` stock atomically via stored procedure.
   - `DR-PAY-001`: Refunds write negative ledger entries into `order_payments` with status `refunded`.
   - `DR-REC-001`: Receipt read model outputs compliant credit note detailing refunded line items.
   - `DR-ERR-001`: Over-refund attempts return HTTP 400 / `REFUND_NOT_ALLOWED`.

3. **DERIVED ENGINEERING DESIGN**:
   - Automated refund test matrix (Full Refund + Restock, Partial Refund + Restock, Non-Stripe Cash Return).
   - Playwright test suite under `e2e/pos-refund-restock.spec.ts`.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Receipt credit note UI modal selector (`data-testid="pos-refund-receipt"`).

---

## 3. Scope Boundaries & Test Paths

- **CANONICAL TEST PATHS**:
  - Automated Playwright browser tests: `e2e/pos-refund-restock.spec.ts` (configured via root `playwright.config.ts`).
  - Automated API integration tests: `tests/api/pos-refund.test.ts`.
- **IN SCOPE**:
  - Automated Playwright tests for POS order search, return dialog, and restock toggles.
  - API integration tests for `POST /api/pos/orders/:id/refund`.
  - Non-Stripe verification: asserting Stripe SDK is never invoked on cash/card-reference returns.
  - Concurrency boundary checks: final unit race with zero negative inventory.
  - Secret scanner execution: `scripts/qa/security/scan-local-secrets.ps1`.
- **EXPLICITLY OUT OF SCOPE**:
  - Redesigning frozen contracts.
  - Automated bank transfer or ACH refunds.

---

## 4. Operational Execution Procedure

1. **Local Test Execution**:
   ```bash
   # Run Playwright Refund E2E suite
   npx playwright test e2e/pos-refund-restock.spec.ts --project=chromium

   # Run API refund integration suite
   npm test tests/api/pos-refund.test.ts

   # Run automated secret scan
   powershell.exe -ExecutionPolicy Bypass -File .\scripts\qa\security\scan-local-secrets.ps1
   ```

2. **Pre-Freeze Verification Gate**:
   Executed immediately prior to branch cut for `rc/client01-v1.0` on **03 Oct 2026**.

---

## 5. Acceptance Criteria Reconciliation

Matches canonical pack `docs/engineering/client-01/execution/CCP-34.md`:
- [ ] Unauthorized users cannot access or submit POS sales or refunds.
- [ ] Cash and card-reference transactions NEVER create fake or real Stripe IDs.
- [ ] Duplicate POS retries do not duplicate order, payment, or inventory effects.
- [ ] Concurrent inventory races never produce negative SellableUnit stock ($S \ge 0$).
- [ ] Refund restitution references exact SellableUnits from order items and increments stock once.
- [ ] Existing Stripe refund behavior is not reused for non-Stripe payments.
- [ ] Secret scanner `scripts/qa/security/scan-local-secrets.ps1` passes with 0 findings.
- [ ] Automated suites `e2e/pos-refund-restock.spec.ts` and `tests/api/pos-refund.test.ts` pass 100%.

---

## 6. Definition of Done & Escalation

- **Definition of Done**: All pre-freeze scenarios validated without defects, approved by QA Automation Lead and Technical Authority.
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Joaquin (proceed to CCP-35 Feature Freeze & RC Tag Cut).
