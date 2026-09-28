# Execution Pack: CCP-34 — POS Refund, Restock & Receipt E2E Test Suite

**Ticket ID**: `CCP-34`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Role / Owner Profile**: QA Engineer / Payments & Inventory Specialist  
**Target Delivery**: Pre-Hardening / RC Hardening  
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)  

---

## 1. Objective, Context & Why

### Objective
Design, implement, and verify the comprehensive end-to-end automated test suite covering Web POS returns, refund processing across multiple payment channels (`cash`, `card_reference`, `stripe`), idempotent inventory restocking, and receipt read model rendering (`DR-REC-001`).

### Why This Matters
Returns and refunds represent high-risk operations where inventory loss or financial loss occurs if controls fail. If an item is refunded without restocking, physical stock is lost to the system; conversely, if a damaged item is improperly restocked, customers buy unusable goods. Furthermore, issuing a cash refund must never invoke the Stripe refund API. CCP-34 provides complete automated verification of these rules.

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
   - `DR-INV-001`: Restocking increments `SellableUnit` stock atomically.
   - `DR-PAY-001`: Refunds write negative ledger entries into `order_payments` with status `refunded` or `partially_refunded`.
   - `DR-REC-001`: Receipt read model outputs compliant credit note detailing refunded line items and amounts.
   - `DR-ERR-001`: Over-refund attempts return HTTP 400 / `REFUND_NOT_ALLOWED`.

3. **DERIVED ENGINEERING DESIGN**:
   - Automated refund test matrix (Full Refund + Restock, Partial Refund + Restock, Return without Restock / Write-off).
   - Playwright test suite under `e2e/pos-refund-restock.spec.ts`.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Receipt credit note UI modal selector (`data-testid="pos-refund-receipt"`).

---

## 3. Scope Boundaries

- **IN SCOPE**:
  - Automated Playwright tests for POS order search, return dialog, and restock toggles.
  - API integration tests for `POST /api/pos/refunds`.
  - Channel isolation verification (verifying Stripe SDK is never invoked for cash/card_reference refunds).
  - Over-refund boundary validation.
  - Receipt credit note schema and print preview verification.
- **EXPLICITLY OUT OF SCOPE**:
  - Automated bank transfer or ACH reversal flows.
  - Physical cash drawer kick triggers.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: `CCP-33` (POS Sales E2E Suite), `CCP-13` (Payment Ledger), `CCP-14` (POS Backend API).
- **Downstream Dependents**: `CCP-35` (Staging Verification), `CCP-37` (Release Gate Sign-off).
- **Preconditions**:
  - Pre-existing completed POS orders in test database (one Cash order, one Card Reference order).
  - Test SellableUnits with known baseline stock.

---

## 5. Step-by-Step Implementation & Verification Guide

```
[Playwright Refund Test Starts]
                 │
                 ▼
[Step 1: Order Lookup by Receipt Number]
         Enter receipt ID in POS Returns tab -> Order details load
                 │
                 ▼
[Step 2: Full Refund with Restock Execution]
         Select all items -> Toggle "Restock to Inventory = YES"
         Submit refund -> Assert HTTP 200 OK
                 │
                 ▼
[Step 3: Database Ledger & Inventory Assertions]
         Assert order_payments records refund entry (amount = -original)
         Assert order status transitions to "refunded"
         Assert sellable_units stock increments by returned quantity
         Assert inventory_movements records RESTOCK_RETURN
                 │
                 ▼
[Step 4: Non-Restock (Write-Off) Return Test]
         Return item -> Toggle "Restock = NO" (damaged goods)
         Assert refund issued but sellable_units stock does NOT increment
                 │
                 ▼
[Step 5: Over-Refund Boundary Prevention Test]
         Attempt second refund on already refunded order
         Assert HTTP 400 / REFUND_NOT_ALLOWED
                 │
                 ▼
[Step 6: Gateway Isolation Test]
         Verify Stripe API mock was NOT invoked during cash/card refund
```

### Execution Commands:

1. **Run Refund E2E Browser Suite**:
   ```bash
   npx playwright test e2e/pos-refund-restock.spec.ts --project=chromium
   ```

2. **Run Refund API Integration Suite**:
   ```powershell
   npm test tests/api/pos-refunds.test.ts
   ```

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Test Case | Scenario | Expected Outcome | Pass Threshold |
| :--- | :--- | :--- | :--- |
| **TC-REF-01** | Full Cash Refund + Restock | Order status `refunded`; cash ledger record created; stock restored | Stock restored; 0 Stripe API calls |
| **TC-REF-02** | Return Damaged (No Restock) | Order status `refunded`; cash refunded; stock unchanged | Stock count identical before & after |
| **TC-REF-03** | Partial Refund | 1 of 2 items returned; order status `partially_refunded`; partial restock | Proportional stock restore |
| **TC-REF-04** | Over-Refund Protection | Attempt to refund $50 on a $40 order | HTTP 400 / `REFUND_NOT_ALLOWED` |
| **TC-REF-05** | Receipt Credit Note Model | Receipt read model renders negative line items and credit slip number | Valid receipt object with `isRefund: true` |

---

## 7. Required Verifiable Evidence

1. **Playwright Execution Summary**:
   HTML report confirming 100% pass for `e2e/pos-refund-restock.spec.ts`.
2. **Database Ledger State Snapshot**:
   SQL query output demonstrating initial sale payment entry paired with compensating refund entry.
3. **Receipt Credit Note JSON Output**:
   Serialized read model demonstrating compliance with `DR-REC-001`.

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] Automated browser and API refund suites pass with 100% reliability.
- [ ] Strict channel separation proven (cash refunds never hit Stripe).
- [ ] Restock toggle accurately controls inventory incrementation.
- [ ] Double-refund and over-refund attacks completely prevented.
- [ ] Receipt credit note renders cleanly across desktop and tablet viewports.

### Escalation Pathway:
- If a cash refund inadvertently invokes Stripe API, immediately escalate as a **Sev-1 Security / Financial Defect** to Rogelio (Backend Lead).
