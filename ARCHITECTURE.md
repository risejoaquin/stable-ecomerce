# Client Commerce Platform / Selfcare Sinners - System Architecture

This document defines the architectural reality of the platform **as it exists today**, establishes explicit technical boundaries, and reconciles current production capabilities against the active delivery sprint and future roadmap.

---

## Architectural Principles & Reality Summary

- **Architecture Style**: Single Monolith Application (Unified Node.js / Express API + React SPA).
- **No Microservices**: The system does NOT employ distributed microservices, service meshes, or decoupled event buses.
- **Single-Merchant Tenancy**: The platform is built and configured for a single commercial merchant (Selfcare Sinners / Client 01). It is NOT a multi-tenant SaaS.
- **Physical POS Scope**: There is NO offline POS runtime or physical hardware POS integration in the repository today.

---

## Architecture Lifecycle Classification

```
┌────────────────────────────────────────────────────────────────────────┐
│ CURRENT ARCHITECTURE (Active in Codebase & Production)                 │
│ - Vite 6 + React 19 Single Page Application                            │
│ - Node.js 22 LTS + Express 4.21 API Server (server.ts / dist)          │
│ - Managed PostgreSQL on Supabase Cloud with strict RLS on core tables  │
│ - Stripe Checkout Sessions & Cryptographic Webhook Handlers            │
│ - Resend Transactional Email Engine with Local DB Queue & Worker       │
│ - Railway Monolith Deployment (heroic-solace / selfcaresinners.com)   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ PLANNED ARCHITECTURE (Client 01 Sprint Scope: 24 Sep - 03 Oct 2026)    │
│ - Client 01 Web POS: In-Browser Web POS Register (cashier UI, sale API)│
│ - Shared Atomic Concurrency Stock Decrement RPC                        │
│ - Digital Receipt View & Email Receipt Dispatch                        │
│ - ADR-009: CSP Inline Script Elimination (PLANNED_DECISION for AUDIT)  │
│ - Supabase schema migration pipeline consolidation                     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ FUTURE ARCHITECTURE (Long-Term Roadmap / Explicitly Out of Scope)      │
│ - Offline-first POS runtime & local SQLite database synchronization    │
│ - Hardware-specific receipt printer drivers (80mm/58mm ESC/POS)        │
│ - Hardware barcode scanner drivers & serial port integrations          │
│ - Advanced multi-location inventory & multi-tenant store provisioning │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. CURRENT Architecture (Implemented & Live)

### 1.1 Frontend Presentation Tier
- **Framework**: React 19.0.1 running on Vite 6.2.3.
- **Styling**: Tailwind CSS v4.1.14 with `@tailwindcss/vite` and Motion (Framer Motion v12) animations.
- **State Management**: Zustand lightweight store and TanStack React Query v5 for server-state caching and synchronization.
- **Routing**: React Router v7 (`/src/routes/lazy-routes.tsx`) with lazy-loaded route boundaries:
  - Storefront routes: `/`, `/product/:id`, `/checkout/success`, `/profile`, `/track`, `/wishlist`, etc.
  - Admin routes: `/admin/dashboard`, `/admin/orders`, `/admin/products`, `/admin/commercial`, `/admin/email-center`, etc.
- **Icons & Assets**: `lucide-react`, Sharp image optimization pipeline, responsive WebP asset delivery.

### 1.2 Backend Application Tier
- **Runtime**: Node.js 22 LTS.
- **Framework**: Express 4.21.2 (`server.ts`), compiled via `esbuild` to CommonJS bundle (`dist/server.cjs`).
- **Middleware & Security**:
  - `helmet`: Strict HTTP headers (HSTS, CSP, X-Frame-Options, MIME sniff guards).
  - `cors`: Restricted cross-origin resource sharing.
  - `express-rate-limit`: Rate limiting applied across public API endpoints.
  - `pino` & `pino-http`: High-performance structured JSON logging.
  - `@sentry/node`: Operational error monitoring and exception tracking.
- **Data Minimization (AUDIT-01A)**:
  - Public `/api/products` and `/api/products/:id` endpoints implement explicit projection whitelisting to eliminate database schema leakages.

### 1.3 Database & Storage Tier (Supabase)
- **Database Engine**: Managed PostgreSQL on Supabase Cloud.
- **Access Model**:
  - `@supabase/supabase-js` client in `server.ts`.
  - Row Level Security (RLS) enabled across configured production tables (e.g. `products`, `orders`, `profiles`). Universal coverage across all database tables is tracked under ongoing audit.
  - Read access permitted to anon role for public catalog; write operations restricted to authenticated users or verified backend service role.
- **Storage**: Supabase Storage buckets for product imagery, assets, and media.

### 1.4 Third-Party Integrations
- **Stripe**:
  - Checkout session creation via `@stripe/stripe-js` and server SDK.
  - Asynchronous order fulfillment driven by cryptographically signed Stripe webhooks (`/api/stripe/webhook` verified with `STRIPE_WEBHOOK_SECRET`).
- **Resend**:
  - Transactional email dispatch (order confirmations, verification emails, cart recovery).
  - Dedicated DB email queue (`email_queue`), asynchronous queue worker (`email-worker.ts`), and incoming webhook endpoint (`email-webhooks.ts`).

### 1.5 Infrastructure & Hosting
- **Provider**: Railway (`heroic-solace`).
- **Deployment Model**: Single container process running `node dist/server.cjs` on port 3000, serving both the static React build (`dist/`) and `/api/*` endpoints.
- **Domain**: `https://selfcaresinners.com`.

---

## 2. PLANNED Architecture (Client 01 Sprint Scope: 24 Sep - 03 Oct 2026)

The following capabilities represent the reconciled delivery backlog for Client 01 (`solidbit.atlassian.net`):

1. **In-Browser Web POS Register**:
   - Web-based cashier interface (`/src/pages/pos/`, `/src/components/pos/`) accessible via authenticated staff roles.
   - Text/SKU quick-search catalog and responsive touchscreen-friendly cart.
   - Tender support: Cash (with automatic change calculation) and Card terminal reference entry.
2. **Shared Concurrency Stock Decrement**:
   - PostgreSQL RPC function executing atomic stock decrements to prevent overselling between simultaneous online checkouts and in-store POS sales.
3. **Digital Receipt & Email Dispatch**:
   - On-screen transaction summary with browser print styling and optional customer email receipt dispatch via Resend.
4. **ADR-009: CSP Inline Script Elimination (Status: `PLANNED_DECISION`)**:
   - Non-authoritative architectural decision designating the extraction strategy for inline discovery scripts in `index.html` to eliminate `'unsafe-inline'` from Helmet CSP during AUDIT-01G implementation.

---

## 3. FUTURE Architecture (Explicitly Out of Scope for Client 01)

The following items are deferred to future platform iterations:

1. **Offline-First POS Runtime**: Local SQLite replication and client-side offline order caching. (A persistent internet connection to the Railway backend is required).
2. **Hardware-Specific Integrations**: External laser/2D barcode scanners and 80mm/58mm ESC/POS thermal printer hardware drivers. (Standard browser printing is used instead).
3. **Multi-Tenant Platform Provisioning**: Dynamic store isolation, multi-branch inventory routing, and complex RBAC matrices.
