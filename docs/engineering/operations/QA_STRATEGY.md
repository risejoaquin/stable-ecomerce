# Quality Assurance Strategy: Client 01 Platform Hardening & Web POS

**Document ID**: `QA-STRAT-001`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Authority**: Authoritative QA Strategy for Client 01 Delivery  
**Target Release**: Client 01 v1.0 (Production: 05 Oct 2026)  
**Parent Epic**: `CCP-40` / `CCP-44`  

---

## 1. Executive Summary & Objective

The objective of the Quality Assurance Strategy is to guarantee deterministic, zero-defect software delivery for the Client 01 milestone, covering the hardened ecommerce storefront, centralized inventory authority, and the browser-based Web Point of Sale (POS) system.

Quality in Client 01 is not an afterthought or a manual verification pass. It is enforced through automated quality gates, verifiable execution evidence, continuous regression prevention, and strict environment parity between local development, continuous integration (CI), staging, and production.

```
       / \
      /   \     E2E Browser Tests (Playwright) - 10%
     /     \    [POS Workflows, Checkout, Cart, Admin]
    /-------\
   /         \   Integration & Contract Tests (Vitest + Supertest) - 25%
  /           \  [API Endpoints, DB Transactions, Stripe Webhooks, Auth Matrix]
 /-------------\
/               \ Unit Tests (Vitest) - 65%
----------------- [Domain Logic, Pricing Engines, Zod Schemas, Idempotency, DTOs]
```

---

## 2. Decision Classifications

In compliance with the project governance framework, all architectural and QA specifications are classified under the four-tier decision model:

1. **FROZEN REQUIREMENT**:
   - Web POS must operate online in standard desktop/mobile browsers.
   - Shared canonical inventory authority (`SellableUnit`) for ecommerce and POS.
   - Single payment ledger (`order_payments`) supporting `stripe`, `cash`, and `card_reference`.
   - Release Calendar: 03 Oct 2026 (Feature Freeze / RC Cut), 04 Oct 2026 (Hardening & UAT), 05 Oct 2026 (Production Release & Handoff).

2. **FROZEN CONTRACT**:
   - `DR-INV-001`: Persistent `SellableUnit` is the sole transactional inventory authority.
   - `DR-PAY-001`: Canonical payment ledger with immutable status transitions.
   - `DR-IDEM-001`: Durable PostgreSQL-backed idempotency via `client_request_id`.
   - `DR-AUTH-001`: POS endpoints restricted strictly to `owner` and `admin` roles.
   - `DR-ERR-001`: Standardized error envelope (`{ error: { code, message, details, requestId } }`).
   - `DR-REC-001`: Deterministic receipt read model generated from persisted order/payment records.

3. **DERIVED ENGINEERING DESIGN**:
   - Automated test pyramid distribution (65% Unit, 25% Integration/Contract, 10% E2E).
   - Test data seeding, synthetic transaction isolation, and cleanup automation.
   - CI hard gate thresholds (100% unit test pass, zero lint warnings, build pass, secret scan pass).
   - Observability correlation ID linking HTTP requests to database locks and Pino logs.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Specific Vitest test fixture helpers and mock utilities.
   - Playwright locator selectors favoring data attributes (`data-testid`).
   - Synthetic load concurrency parameters during local stress sweeps.

---

## 3. Test Pyramid Distribution & Test Types

### 3.1 Unit Tests (Target: 65% of Total Test Corpus)
- **Framework**: Vitest (`npm test`).
- **Execution Target**: < 15 seconds locally; fully parallelized.
- **Scope**:
  - Validation schemas (Zod) for order creation, POS sales requests, and refund inputs.
  - Server-authoritative calculation algorithms (line totals, discounts, shipping, tax).
  - Domain state machines: Order status transitions (`pending` → `paid` → `fulfilled` / `refunded`), Payment status transitions (`pending` → `captured` → `refunded`).
  - Error envelope transformation and formatting (`DR-ERR-001`).
  - Idempotency key generation and payload hashing.
- **Coverage Target**: Minimum 85% branch coverage on domain and calculation services.

### 3.2 Integration & Contract Tests (Target: 25% of Total Test Corpus)
- **Framework**: Vitest + Supertest (`tests/api/`).
- **Scope**:
  - API endpoint behavioral contracts (`POST /api/pos/sales`, `POST /api/orders`, `POST /api/pos/refunds`).
  - Database transactional atomicity: Row-level locking (`FOR UPDATE`) on `sellable_units` to prevent negative stock overselling under concurrent requests.
  - Idempotency engine verification (`DR-IDEM-001`): Verifying that identical `client_request_id` returns the cached response and payload mismatch returns `409 IDEMPOTENCY_CONFLICT`.
  - Role-based authorization matrix (`DR-AUTH-001`): Ensuring `user` and `support` roles receive `403 FORBIDDEN` on POS routes, while `admin` and `owner` succeed.
  - Stripe webhook simulation: Signature verification, idempotent event ingestion, and transition of order payments to `captured`.

### 3.3 End-to-End Browser Tests (Target: 10% of Total Test Corpus)
- **Framework**: Playwright (`npm run test:e2e`).
- **Browsers**: Desktop Chromium, Mobile Chromium (Pixel 5 emulation).
- **Scope**:
  - **Online Ecommerce Flow**: Catalog browsing → Add to cart → Checkout with Stripe Test Card → Order confirmation receipt.
  - **POS Web Cash Sale Flow**: Cashier authentication → Open POS terminal → Search catalog / scan SKU → Add item to cart → Select Cash Tender → Input tendered amount → Calculate change → Finalize sale → Display and print receipt.
  - **POS Web External Card Flow**: Select Card Reference Tender → Record external terminal reference / authorization code → Finalize sale → Verify ledger entry.
  - **POS Refund & Restock Flow**: Order lookup by receipt ID → Initiate full/partial refund → Return item to stock → Restock verification in inventory ledger → Print refund credit note.
  - **Accessibility & Responsive**: Full WCAG 2.1 AA accessibility checks (`@axe-core/playwright`) and mobile responsive viewport verification.

### 3.4 Concurrency & Performance Load Tests
- **Harness**: Specialized automated concurrency runners (`tests/concurrency/` / k6 / autocannon).
- **Scope**:
  - Concurrent checkout against limited inventory (e.g., 50 parallel requests competing for 5 available SKU items).
  - Verification that exactly 5 succeed, 45 receive HTTP 409 / `INSUFFICIENT_STOCK`, and total stock terminates exactly at 0 (never negative).
  - P95 response latency benchmark: POS sales transaction completion < 800ms under 10 concurrent POS terminals.

---

## 4. Test Environments & Tiering

| Environment | Purpose | Infrastructure | Data Isolation | External Integrations |
| :--- | :--- | :--- | :--- | :--- |
| **Local** | Developer iteration, unit testing, fast component testing | Local Node.js v22, in-memory mocks / SQLite / local PostgreSQL | Ephemeral in-memory fixtures | Mocked Stripe, Mocked Resend |
| **CI (GitHub Actions)** | Hard merge gates, regression prevention, artifact builds | Windows Server 2022 runner (`windows-latest`) | Clean container setup per workflow run | Mocked Stripe webhook secrets, synthetic fixtures |
| **Staging** | UAT, cross-boundary regression, concurrency load testing | Railway Staging Service + Supabase Staging Database | Dedicated staging tenant data; automated seed/teardown | Stripe Test Mode, Resend Sandbox / Sinkhole |
| **Production Canary** | Real-world validation, synthetic zero-impact smoke checks | Railway Production (`heroic-solace`), Supabase (`dporfgsbwsyqzmlnqrug`) | Read-only synthetic queries, dedicated canary test store | Stripe Live Mode (synthetic validation uses non-mutating checks) |

---

## 5. Test Data Management & Seeding Strategy

### 5.1 Deterministic Test Fixtures
- All test fixtures must be declarative and reproducible via seed scripts (`scripts/qa/seed/`).
- Primary test entities required for POS and Ecommerce validation:
  1. **Primary Store**: `test-store-selfcare` (isolated from production catalog).
  2. **SellableUnits (SKUs)**:
     - `SKU-POS-STANDARD-01`: Standard product, unlimited stock (stock = 1,000).
     - `SKU-POS-LIMITED-05`: Scarcity product, exactly 5 units in stock (for oversell testing).
     - `SKU-POS-ZERO-00`: Out of stock product, exactly 0 units (for boundary testing).
     - `SKU-POS-VARIANT-XL`: Multi-variant product SKU (for variant selection validation).
  3. **Users & Credentials**:
     - `admin-pos-test@selfcaresinners.com`: Authorized POS Cashier / Store Admin.
     - `customer-pos-test@selfcaresinners.com`: Registered ecommerce customer.
     - `guest-user`: Unauthenticated session identifier.

### 5.2 Test Teardown & Synthetic Transaction Hygiene
- In automated test runs, test orders and inventory mutations must be prefixed with `SYNTH-TEST-` or tagged with `metadata.is_test = true`.
- Staging database cleanup jobs run automatically post-regression to prune synthetic records older than 24 hours while preserving audit integrity.
- Production smoke tests are strictly non-mutating (health check, catalog retrieval, read-only category querying) or execute against dedicated canary SKUs marked internal and inactive.

---

## 6. The Evidence Standard

No QA gate or defect remediation is accepted without verifiable execution evidence adhering to the seven-step standard:

```
+-----------------------------------------------------------------------------+
|                            THE EVIDENCE STANDARD                            |
+-----------------------------------------------------------------------------+
| 1. EXPECTED        : Concrete requirement or contract assertion.           |
| 2. TEST            : Exact command or script executed with arguments.       |
| 3. OBSERVED        : Raw stdout, stderr, HTTP status, or database state.     |
| 4. CAUSE           : Root cause diagnosis identifying code or schema defect.|
| 5. SAFE REMEDIATION: Minimal, non-regressive patch correcting the defect.   |
| 6. RETEST          : Re-execution of the test under identical conditions.   |
| 7. EVIDENCE        : Persisted log, screenshot, or CI artifact link.       |
+-----------------------------------------------------------------------------+
```

---

## 7. QA Governance & Escalation Flow

```
[Defect Discovered]
       |
       v
[Triage Severity]
   ├── Sev-1 (Critical: Payment loss, inventory corruption, auth bypass) ──> STOP RELEASE -> Incident Commander
   ├── Sev-2 (Major: POS sales blocked, receipt generation failing)       ──> BLOCK RC MERGE -> Engineering Lead
   ├── Sev-3 (Minor: UI glitch, non-blocking validation message error)   ──> Log in Jira -> Fix during Hardening
   └── Sev-4 (Trivial: Copy typo, minor layout alignment)               ──> Backlog for Post-v1.0
```

- **Zero-Bypass Policy**: Automated quality gates cannot be bypassed, skipped, or weakened using `--no-verify`, disabling tests, or modifying assertion thresholds to achieve a green state.
- **Authorization Authority**: Any gate waiver requires explicit written sign-off from both the Quality Assurance Lead and the Product Owner.
