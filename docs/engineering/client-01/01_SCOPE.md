# Client 01 Scope & Architectural Boundaries

## 1. Executive Summary

This document establishes the authoritative boundaries of **Client 01 (Selfcare Sinners)**. It strictly demarcates what is included within the active implementation cycle and what is explicitly excluded.

Engineering teams must not expand the boundaries defined herein. Any modification to these boundaries requires a formal architectural amendment approved by project governance.

---

## 2. In-Scope Deliverables (Client 01)

The following capabilities, systems, and enhancements constitute the complete in-scope commitment for Client 01:

### 2.1 Omnichannel Inventory Foundation
- **Persistent SellableUnit (`SKU`) Data Model**: Decoupling catalog presentation entities (`Product`) from atomic inventory items (`SellableUnit`).
- **Unified Inventory Authority**: Single source of truth across online storefront orders and physical Web POS sales.
- **Atomic Stock Concurrency**: PostgreSQL stored procedures executing row-level locks (`SELECT ... FOR UPDATE`) to guarantee zero overselling under heavy simultaneous contention.
- **Inventory Movement Ledger**: Mandatory immutable tracking of every stock decrement, restock, manual adjustment, and refund with causal foreign keys (`order_id`, `sellable_unit_id`).

### 2.2 In-Browser Web POS (Point of Sale)
- **Cashier Register UI**: Touch-friendly, high-contrast, responsive React interface accessible via web browsers on standard desktop/tablet screens.
- **Fast Product Search**: Instant keyword, SKU, and barcode lookup with sub-100ms response targets for catalog scanning.
- **Cart & Tender Calculation**: Client-side cart staging with server-authoritative price validation and tax/total computation.
- **Dual Tender Modals**:
  - **Cash Tender**: Exact change calculation, cash tendered input, and change due prompt.
  - **External Card Reference**: Non-integrated card terminal flow requiring manual entry of the physical terminal authorization/reference code.

### 2.3 Canonical Order & Payment Ledger
- **Omnichannel Canonical Orders**: Unified `orders` model recording channel origin (`web_storefront` vs `pos_register`), terminal identifiers, and operating cashier identifiers.
- **Decoupled Payment Ledger (`order_payments`)**: Transactional ledger recording individual tender events with distinct statuses, payment methods, and idempotency guarantees.
- **Audit Trails**: Security audit events logging actor, action, timestamp, and metadata for every financial and inventory event.

### 2.4 Receipts & Post-Sale Communications
- **Deterministic Receipt Read Model**: Pure server-side read model calculated from immutable order and payment records.
- **Browser Thermal Printing**: Standard `@media print` optimized CSS stylesheets targeting standard 80mm roll receipts without external drivers.
- **Transactional Digital Receipts**: Optional customer email delivery via the existing Resend queue worker, designed with non-blocking failure isolation.

### 2.5 Returns, Refunds & Restock
- **In-Store Return Processing**: Cashier/admin interface to process returns against completed orders.
- **Channel-Aware Refund Execution**:
  - Stripe payments: Trigger external Stripe Refund API.
  - Cash / Card Reference payments: Record internal ledger refunds without external API invocation.
- **Idempotent Stock Restock**: PostgreSQL stored procedure restoring inventory to the exact `SellableUnit`.

### 2.6 Security, Role Enforcement & Operations
- **Role Enforcement (DR-AUTH-001)**: Enforce backend API guards allowing only `owner` and `admin` roles to access POS endpoints. Deny `user` and `support` roles.
- **Durable Idempotency Engine**: PostgreSQL-backed request de-duplication preventing duplicate charges or orders during network instability.
- **Admin Management Consoles**: UI extensions in the existing `/admin` route to manage `SellableUnits`, stock levels, and inspect payment ledger records.
- **Automated Verification**: Vitest unit suites, PostgreSQL concurrency tests, and Playwright end-to-end integration tests.

---

## 3. Explicit Out-of-Scope Items (Client 01 Exclusions)

The following items are **strictly excluded** from Client 01. Engineers are prohibited from designing, prototyping, or implementing code supporting these features during this sprint:

| Exclusion Item | Rationale & Architectural Posture |
| :--- | :--- |
| **Offline-First POS Runtime** | The POS requires a stable, active internet connection to the Railway backend. No local SQLite replication, ServiceWorker background sync, or IndexedDB caching will be built. |
| **Hardware Printer Drivers** | Standard browser printing (`window.print()`) via OS print dialogs is used. No direct ESC/POS raw socket or USB driver integrations. |
| **Payment Terminal SDK Integration** | No direct Bluetooth, USB, or IP communication with physical Verifone, Ingenico, or Stripe Terminal card readers. External card payments are manual reference entry only. |
| **Native Mobile Applications** | No React Native, Flutter, Swift, or Kotlin apps. All operational UIs are responsive Web SPAs. |
| **True Multi-Location Warehousing** | Single physical store/warehouse location assumption. No multi-node inventory transfers or localized stock routing. |
| **SaaS Multi-Tenant Provisioning** | Single-merchant dedicated architecture for Selfcare Sinners. No tenant isolation keys or multi-tenant database partitioning. |
| **Mexican CFDI Invoicing** | Electronic invoicing (PAC / SAT stamping) is not included in Client 01 and will be addressed in a subsequent commercial phase. |
| **Active Meta Commerce / CAPI** | No active server-side Facebook Conversions API or Meta catalog synchronization in this milestone. |
| **Distributed Microservices / Message Brokers** | No Kafka, RabbitMQ, Redis Pub/Sub, or microservice extractions. The platform remains a modular Express/PostgreSQL monolith. |
| **Dedicated "Cashier" User Role** | Staff operating the POS must hold existing `owner` or `admin` roles. No new RBAC role is created for Client 01. |

---

## 4. Operating Assumptions & System Constraints

1. **Network Connectivity**: Cashier devices maintain reliable broadband or 4G/5G cellular failover. In the event of network disruption, the terminal displays an offline blocking notification rather than accepting uncommitted local sales.
2. **Pricing Authority**: The web browser is strictly an untrusted display client. All item prices, taxes, and order totals are calculated exclusively by the Node.js backend using database records.
3. **Database Availability**: Supabase Managed PostgreSQL handles connection pooling through transaction mode poolers.
4. **Currency**: All commercial operations for Client 01 are denominated in Mexican Pesos (`MXN`).
