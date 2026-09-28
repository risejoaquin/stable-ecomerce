# User Acceptance Testing (UAT) Execution Runbook

**Document ID**: `RB-UAT-001`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Authority**: Authoritative Operational Protocol for User Acceptance Testing  
**Execution Date**: **04 Oct 2026** (Mandatory & Frozen)  
**Parent Epic**: `CCP-44`  

---

## 1. Purpose & Calendar Context

This runbook defines the structured protocol, test scripts, and sign-off criteria for executing User Acceptance Testing (UAT) with business stakeholders and retail store operators on **04 Oct 2026**.

UAT verifies that the Client 01 platform meets real-world retail workflows, cashier ergonomics, and business operational requirements prior to production release on **05 Oct 2026**.

> **CRITICAL CALENDAR RULE (FROZEN)**:  
> **UAT executes on 04 Oct 2026.** Production Release and operational handoff occur on **05 Oct 2026**. Stale references to 03 Oct production handoff are strictly superseded.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Web POS must execute seamlessly within standard Chrome / Safari / Edge desktop and tablet browsers without requiring native hardware drivers.
   - All completed transactions must generate a printable, compliant receipt.
   - Formal written sign-off from the Business Product Owner and Retail Operations Lead is mandatory prior to production deployment.

2. **FROZEN CONTRACT**:
   - `DR-INV-001`: Selling the last unit in POS must immediately prevent online checkout of that unit.
   - `DR-PAY-001`: Cash and external card tenders must record accurately in the payment ledger without creating fake Stripe records.
   - `DR-REC-001`: Receipt data must reflect exact tax, line items, and payment details.

3. **DERIVED ENGINEERING DESIGN**:
   - Five standardized business validation scenarios.
   - Stakeholder defect logging rubric and severity triage.
   - UAT sign-off certificate template.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Browser zoom and display scaling guidelines for tablet testing.

---

## 3. UAT Participants & Roles

| Role | Name / Title | Responsibilities |
| :--- | :--- | :--- |
| **Business Product Owner** | Julian (Product Lead) | Overall product acceptance, business rules sign-off |
| **Retail Operations Lead** | Store Operations Manager | Cash handling validation, cashier ergonomics, receipt formatting |
| **Lead Cashier Tester** | Senior Cashier Specialist | Hands-on POS workflow execution, catalog search, barcode scanning |
| **QA Test Coordinator** | Agent C / QA Lead | Test environment setup, script facilitation, defect logging |
| **Technical Support Lead** | Rogelio (Engineering Lead) | Immediate technical triage of reported anomalies |

---

## 4. Structured UAT Test Scenarios

### Scenario UAT-01: Online Storefront Customer Journey
- **Persona**: Retail Online Customer
- **Environment**: Staging (`https://staging.selfcaresinners.com`)
- **Steps**:
  1. Access storefront home page; verify hero banner, category navigation, and soft-premium theme consistency.
  2. Search for a product, open Product Detail Page (PDP), verify high-resolution images and responsive layout.
  3. Add item to cart; verify slide-over cart drawer and line total calculations.
  4. Proceed to Checkout; enter customer details and test shipping address.
  5. Enter Stripe Test Card (`4242 ... 4242`); submit payment.
- **Expected Outcome**:
  - Payment completes in < 3 seconds; order confirmation page displays order ID and receipt breakdown.
  - Transactional order confirmation email arrives in customer sandbox inbox.

### Scenario UAT-02: Web POS Counter Sale — Cash Tender
- **Persona**: Retail Store Cashier
- **Environment**: Staging POS Terminal (`https://staging.selfcaresinners.com/pos`)
- **Steps**:
  1. Authenticate using store admin credentials; verify POS interface loads with quick-access catalog.
  2. Search for product by SKU or name; click to add 2 units to the current POS register order.
  3. Review cart total ($40.00); click **Tender Sale**.
  4. Select **Cash Tender**; cashier inputs $50.00 cash tendered.
  5. Verify change calculation displays exactly **$10.00 Change Due**.
  6. Click **Finalize Sale**; verify register receipt drawer pops or receipt dialog opens.
  7. Print or preview receipt.
- **Expected Outcome**:
  - Sale successfully recorded; change calculated accurately; receipt displays store name, date, cashier ID, items, and tender breakdown.
  - Stock in inventory ledger decrements by exactly 2 units.

### Scenario UAT-03: Web POS Counter Sale — External Card Tender
- **Persona**: Retail Store Cashier
- **Environment**: Staging POS Terminal
- **Steps**:
  1. Add item ($35.00) to POS cart; click **Tender Sale**.
  2. Select **Card Reference (External Terminal)**.
  3. Swipes/inserts physical test card into standalone physical terminal (or simulates external card swipe).
  4. Terminal outputs authorization code: `AUTH-98742`.
  5. Cashier enters `AUTH-98742` into POS card reference input field; clicks **Finalize Sale**.
- **Expected Outcome**:
  - POS marks sale as completed; receipt indicates "Payment Method: External Card (Ref: AUTH-98742)".
  - Database verifies that NO Stripe API charge was dispatched for this external terminal tender.

### Scenario UAT-04: Real-Time Omnichannel Inventory Sync
- **Persona**: Store Manager & Online Customer
- **Environment**: Staging Storefront + Staging POS
- **Steps**:
  1. Verify SKU `SKU-POS-LIMITED-01` has initial stock of exactly 1 unit.
  2. Online customer views PDP for `SKU-POS-LIMITED-01` (shows "1 in stock").
  3. In Web POS, cashier adds this exact SKU to the cart and finalizes a cash sale.
  4. Online customer refreshes PDP or attempts to add the item to the online cart.
- **Expected Outcome**:
  - Online storefront immediately displays "Out of Stock" or blocks checkout with "Item no longer available".
  - Negative inventory is completely prevented.

### Scenario UAT-05: Web POS Return & Restock
- **Persona**: Store Manager
- **Environment**: Staging POS Terminal
- **Steps**:
  1. Customer presents receipt from Scenario UAT-02.
  2. Cashier navigates to **POS Orders / Returns**; enters Receipt ID or scans receipt barcode.
  3. System displays original order details, line items, and payment channel (Cash).
  4. Cashier selects item to return (1 unit); toggles **Restock Item into Inventory = YES**.
  5. Confirms refund of $20.00 cash to customer.
- **Expected Outcome**:
  - Refund credit receipt printed; `order_payments` records refund entry; inventory for `SellableUnit` increments by 1 unit in real time.

---

## 5. UAT Defect Logging & Classification

When a tester observes unexpected behavior, it must be logged immediately using the standard template:

```markdown
### UAT Defect: [Short Description]
- **Scenario**: [e.g. UAT-02 Step 5]
- **Tester**: [Name]
- **Device / Browser**: [e.g. iPad Safari 17 / Chrome 129 Windows]
- **EXPECTED**: [What should happen]
- **OBSERVED**: [What actually happened]
- **SEVERITY**: [Sev-1 / Sev-2 / Sev-3 / Sev-4]
- **SCREENSHOT / LOG**: [Link to screenshot]
```

- Any **Sev-1** or **Sev-2** defect blocks UAT sign-off and is escalated immediately to Rogelio (Tech Lead) for remediation during the Hardening window.

---

## 6. Formal Acceptance Sign-Off Certificate

At the conclusion of testing on **04 Oct 2026 (21:00 UTC)**, the sign-off certificate is finalized:

```
+-----------------------------------------------------------------------------+
|               CLIENT 01 USER ACCEPTANCE TESTING SIGN-OFF CERTIFICATE         |
+-----------------------------------------------------------------------------+
| Date: 04 Oct 2026                                                           |
| Target Release: Client 01 v1.0 (Production Release: 05 Oct 2026)            |
| Environment Tested: Staging (Release Candidate v1.0.0-rc.1 / v1.0.0-rc.2)  |
|                                                                             |
| SCENARIOS EVALUATED:                                                        |
| [X] UAT-01: Online Storefront Customer Journey            - PASS            |
| [X] UAT-02: Web POS Counter Sale (Cash Tender)             - PASS            |
| [X] UAT-03: Web POS Counter Sale (Card Reference)         - PASS            |
| [X] UAT-04: Real-Time Omnichannel Inventory Sync          - PASS            |
| [X] UAT-05: Web POS Return & Restock                      - PASS            |
|                                                                             |
| BLOCKING DEFECTS REMAINING: ZERO (0)                                        |
|                                                                             |
| SIGNATURES:                                                                 |
| Business Product Owner: [Signed: Julian]             Date: 04 Oct 2026      |
| Retail Operations Lead: [Signed: Retail Ops]         Date: 04 Oct 2026      |
| QA / Operations Lead  : [Signed: Agent C]            Date: 04 Oct 2026      |
|                                                                             |
| RECOMMENDATION: APPROVED FOR PRODUCTION DEPLOYMENT ON 05 OCT 2026           |
+-----------------------------------------------------------------------------+
```
