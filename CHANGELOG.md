# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project records major milestone initiatives, verified security remediations, and architectural reorganizations.

---

## [Unreleased]

### In Progress
- **RG-01 Repository Governance & Information Architecture**:
  - Restructured root-level legacy artifacts into organized directory hierarchies across 6 verified atomic waves (`docs/archive/`, `docs/commercial/`, `artifacts/archive/`, `evidence/security/`, `AGENT_CONTEXT/`, `scripts/archive/`, `scripts/diagnostics/`, and `docs/database/reference/`).
  - Achieved 100% byte-for-byte content invariance across 259 physical file relocations through Waves 1–6 with zero runtime deletions.
  - Wave 7 governance content specification in review; Wave 8 documentation index pending.

### Planned (Client 01 Delivery Sprint: 24 Sep – 03 Oct 2026)
- **Web POS System**: In-store cashier interface, digital receipts, and cash/card sales processing.
- **Inventory Concurrency**: Atomic stock decrement RPC shared between online storefront and POS.
- **ADR-009 / AUDIT-01G**: Static extraction of inline discovery scripts from `index.html` to eliminate `'unsafe-inline'` from CSP.

---

## [AUDIT-01A] - 2026-09-22

### Security
- **Public API Data Minimization & Projection Hardening**:
  - Hardened `/api/products` and `/api/products/:id` endpoints in `server.ts` to strictly whitelist public product attributes.
  - Eliminated unintentional data leakage of internal cost structures, warehouse metadata, and unpublished inventory flags.
  - Added automated security contract test suite: `tests/security/audit-01a-data-minimization.test.ts`.

---

## [Roadmap 1.0 Closure] - 2026-09-22

### Added
- **PL20 Post-Launch Stabilization**:
  - Finalized post-launch release gate validation (`npm run qa:release` and `validate-production.ps1`).
  - Implemented multi-currency operational cost intake and capacity baseline characterization.
  - Verified end-to-end checkout, Stripe webhook processing, and Resend transactional email worker in production on Railway (`heroic-solace`).
  - Archived Roadmap 1.0 completion evidence in `docs/release/FINAL_PROJECT_STATUS_REPORT.md`.
