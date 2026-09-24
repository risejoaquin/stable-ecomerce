## Jira Ticket Reference
- **Jira Issue**: [KEY-XXXX](https://solidbit.atlassian.net/browse/KEY-XXXX)

---

## Summary of Changes
<!-- Concise explanation of what was modified, why, and the user-observable result. -->

---

## Architectural Classification
- [ ] **CURRENT**: Core Monolith Web Storefront / Admin / Express API / Supabase RLS
- [ ] **PLANNED (Client 01 Delivery Scope)**: Web POS in-store sale, shared stock decrement RPC, digital receipt view, ADR-009 CSP inline script static extraction
- [ ] **FUTURE (Post-Launch / Out of Scope)**: Hardware-specific thermal printers, offline SQLite POS runtime, multi-tenant provisioning

### Subsystem Affected
- [ ] Storefront Customer UI (`/src/pages/store/`, `/src/components/storefront/`)
- [ ] Web POS UI (`/src/pages/pos/`, `/src/components/pos/`)
- [ ] Admin Command Center (`/src/pages/admin/`, `/src/components/admin/`)
- [ ] Backend Express API (`server.ts`, `/src/server/`)
- [ ] Database Schema & Supabase RLS (`/supabase/`, `/docs/database/`)
- [ ] Third-Party Integrations (Stripe Checkout / Webhooks, Resend Email)
- [ ] Quality Assurance & Automation (`scripts/qa/`, `.github/`, tests)

---

## Local Verification Checklist
*All checks must pass locally before requesting peer review:*

- [ ] `npm run lint` — TypeScript compiler checks passed (`tsc --noEmit`).
- [ ] `npm test` — Vitest unit & integration tests executed cleanly.
- [ ] `npm run build` — Client Vite build and server esbuild bundle compile cleanly.
- [ ] `npm run qa:fast` — Local PowerShell pre-gate passes cleanly.
- [ ] `npm run qa:release` *(Required for release candidates, security patches, or DB DDL)*.
- [ ] `npm run test:e2e` *(Required if checkout, POS sale, or auth flows are touched)*.

---

## Security & Architecture Invariance
- [ ] **Zero Hardcoded Secrets**: Scanned via `.\scripts\qa\security\scan-local-secrets.ps1`.
- [ ] **Data Minimization**: Public endpoints whitelist attributes; internal cost/inventory metadata is protected.
- [ ] **Concurrency Stock Integrity**: Inventory changes utilize atomic decrement logic to prevent negative stock.
- [ ] **No Direct Main Development**: Branched cleanly from latest `main` in accordance with team development policy.

---

## Deployment & Production Validation Plan
1. Confirm `/api/health` reports status `ok` and matches deployed commit SHA.
2. Execute production validation smoke script:
   `.\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "<COMMIT_SHA>"`
