# Repository Documentation Index

This directory serves as the canonical knowledge base and information architecture index for the platform. It provides a structured catalog of authoritative specifications, operational runbooks, technical designs, and historical archives.

---

## 1. CURRENT / AUTHORITATIVE

The foundational governance and architectural specifications governing development and release operations:

| Document | Purpose | Codeowner |
| :--- | :--- | :--- |
| [**`ARCHITECTURE.md`**](../ARCHITECTURE.md) | Authoritative technical architecture, system tiers, and CURRENT / PLANNED / FUTURE boundaries. | `@risejoaquin` |
| [**`CONTRIBUTING.md`**](../CONTRIBUTING.md) | 10-step development lifecycle, branching strategy, local verification scripts, and PR rules. | `@risejoaquin` |
| [**`SECURITY.md`**](../SECURITY.md) | Vulnerability disclosure policy, active safeguards, and private reporting instructions. | `@risejoaquin` |
| [**`CHANGELOG.md`**](../CHANGELOG.md) | Keep a Changelog 1.1 records of verified milestones, security remediations, and releases. | `@risejoaquin` |
| [**`.github/CODEOWNERS`**](../.github/CODEOWNERS) | Path-based code ownership and PR review assignments across the engineering team. | `@risejoaquin` |

---

## 2. ACTIVE ROADMAP

Near-term delivery scope, planning contracts, and sprint specifications:

- **Active Delivery Tracking**: [`CHANGELOG.md#unreleased`](../CHANGELOG.md#unreleased) (Planned delivery scope including Web POS and inventory concurrency).
- **Master Roadmap Baseline**: [`AGENT_CONTEXT/governance/02_MASTER_ROADMAP.md`](../AGENT_CONTEXT/governance/02_MASTER_ROADMAP.md) (Authoritative macrofase roadmap).
- **Strategic Roadmap 2 Reference**: [`artifacts/pl20-final-closure/strategic-roadmap-2-final.md`](../artifacts/pl20-final-closure/strategic-roadmap-2-final.md) (Post-Roadmap 1.0 platform evolution).
- **Commercial Scale & Roadmap Report**: [`docs/commercial/POST_LAUNCH_20_FINAL_COMMERCIAL_SCALE_REPORT_STRATEGIC_ROADMAP.md`](commercial/POST_LAUNCH_20_FINAL_COMMERCIAL_SCALE_REPORT_STRATEGIC_ROADMAP.md).

---

## 3. RELEASE / OPERATIONS

Production launch sign-offs, accessibility verifications, and operational runbooks:

- **Final Project Status Report**: [`docs/release/FINAL_PROJECT_STATUS_REPORT.md`](release/FINAL_PROJECT_STATUS_REPORT.md) (Roadmap 1.0 closure & production sign-off).
- **Accessibility & Responsive Checklist**: [`docs/release/ACCESSIBILITY_RESPONSIVE_FINAL_CHECKLIST.md`](release/ACCESSIBILITY_RESPONSIVE_FINAL_CHECKLIST.md) (Production compliance).
- **QA Automation Foundation**: [`docs/qa/QA_AUTOMATION_FOUNDATION.md`](qa/QA_AUTOMATION_FOUNDATION.md) (Automated test suites & gating).
- **Operational Verification Scripts**:
  - Fast Gate: [`scripts/qa/validate-fast.ps1`](../scripts/qa/validate-fast.ps1)
  - Release Gate: [`scripts/qa/validate-release.ps1`](../scripts/qa/validate-release.ps1)
  - Production Validation: [`scripts/qa/validate-production.ps1`](../scripts/qa/validate-production.ps1)

---

## 4. SECURITY

Security baseline reports, hardening runbooks, and automated audit scripts:

- **Security Policy**: [`SECURITY.md`](../SECURITY.md) (Responsible disclosure and active security baseline).
- **Dependency Security Hardening**: [`docs/security/POST_UX_A_DEPENDENCY_SECURITY_HARDENING.md`](security/POST_UX_A_DEPENDENCY_SECURITY_HARDENING.md).
- **Data Minimization Contract Tests**: [`tests/security/audit-01a-data-minimization.test.ts`](../tests/security/audit-01a-data-minimization.test.ts) (AUDIT-01A public projection tests).
- **Automated Security Tools**:
  - Local Secret Scanner: [`scripts/qa/security/scan-local-secrets.ps1`](../scripts/qa/security/scan-local-secrets.ps1)
  - Baseline Security Validator: [`scripts/qa/security/validate-security-baseline.ps1`](../scripts/qa/security/validate-security-baseline.ps1)
  - Resend Webhook Validator: [`scripts/qa/security/validate-resend-webhook-signature.ps1`](../scripts/qa/security/validate-resend-webhook-signature.ps1)

---

## 5. DATABASE

Database schema definitions, reference catalogs, and security inspection tools:

- **Database Schema Snapshot**: [`docs/database/reference/database_schema.sql`](database/reference/database_schema.sql) (Baseline PostgreSQL structure).
- **Supabase Local Configuration**: [`supabase/config.toml`](../supabase/config.toml).
- **Database Security Validator**: [`scripts/qa/database/validate-database-security.ps1`](../scripts/qa/database/validate-database-security.ps1).
- **Integrity SQL Queries**: [`scripts/qa/check-supabase-integrity.sql`](../scripts/qa/check-supabase-integrity.sql).

---

## 6. DESIGN

Visual identity, UIX specifications, theme tokens, and component guidelines:

- **Editorial Commerce Direction**: [`docs/design/UIX03_EDITORIAL_COMMERCE_DIRECTION.md`](design/UIX03_EDITORIAL_COMMERCE_DIRECTION.md).
- **Admin Command Center Architecture**: [`docs/design/UIX_SYSTEM_B_ADMIN_COMMAND_CENTER_ARCHITECTURE.md`](design/UIX_SYSTEM_B_ADMIN_COMMAND_CENTER_ARCHITECTURE.md).
- **Soft Premium Theme Guide**: [`docs/design/UIX04_ADMIN_THEME_GUIDE.md`](design/UIX04_ADMIN_THEME_GUIDE.md).
- **Design System Freeze**: [`docs/design/UI_C_FINAL_DESIGN_SYSTEM_FREEZE.md`](design/UI_C_FINAL_DESIGN_SYSTEM_FREEZE.md).
- **Storefront & Account Navigation**: [`docs/uix/URGENT_FLOW_01_LOGOUT_ACCOUNT_NAVIGATION.md`](uix/URGENT_FLOW_01_LOGOUT_ACCOUNT_NAVIGATION.md).

---

## 7. HISTORICAL / ARCHIVE

Relocated legacy sprint assets and evidence preserved under zero-deletion governance:

- **Documentation Archive**: [`docs/archive/`](archive/) (Legacy hotfix docs, sprint summaries, and superseded implementation plans).
- **Commercial Requirements Archive**: [`docs/commercial/`](commercial/) (Business requirements and vendor assessments).
- **Emergency Deduplication Archive**: [`docs/emergency/`](emergency/) (Records of EMERGENCY-DRY-01 through DRY-05).
- **Historical QA Scripts**: [`scripts/archive/`](../scripts/archive/) (Superseded smoke tests).
- **Historical Artifacts**: [`artifacts/archive/`](../artifacts/archive/) (Legacy test result snapshots).

---

## 8. AGENT CONTEXT

Guidelines and operating protocols for autonomous and paired engineering agents:

- **Codex / Local Agent Operating Manual**: [`AGENTS.md`](../AGENTS.md) (Source of truth for local execution protocols).
- **Governance & Scope Guards**:
  - Read First: [`AGENT_CONTEXT/governance/00_READ_FIRST.md`](../AGENT_CONTEXT/governance/00_READ_FIRST.md)
  - Architecture Overview: [`AGENT_CONTEXT/governance/01_ARCHITECTURE_OVERVIEW.md`](../AGENT_CONTEXT/governance/01_ARCHITECTURE_OVERVIEW.md)
  - Scope Guard (Do Not Touch): [`AGENT_CONTEXT/governance/04_DO_NOT_TOUCH.md`](../AGENT_CONTEXT/governance/04_DO_NOT_TOUCH.md)
  - Commands Reference: [`AGENT_CONTEXT/governance/06_COMMANDS_REFERENCE.md`](../AGENT_CONTEXT/governance/06_COMMANDS_REFERENCE.md)
  - Agent Handoff Protocol: [`AGENT_CONTEXT/governance/08_AGENT_HANDOFF_PROTOCOL.md`](../AGENT_CONTEXT/governance/08_AGENT_HANDOFF_PROTOCOL.md)
- **Handoff Records**: [`AGENT_CONTEXT/handoffs/`](../AGENT_CONTEXT/handoffs/)
