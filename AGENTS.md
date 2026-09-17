# AGENTS.md
# Selfcare Sinners / Stable Ecommerce

## Purpose

This repository is developed using a coordinated workflow between:

- ChatGPT Web: primary reasoning, architecture, diagnosis, planning, code review, remediation design and PASS/FAIL decisions.
- Codex local agent: local execution, file inspection, simple implementation, testing, Git operations, deployment commands and evidence collection.
- User: final authority for product/business decisions and credentials/permissions when required.

Codex is primarily an execution agent.

Do not independently redesign the project, invent phases, change architecture, or expand scope unless explicitly instructed.

---

# Project

Name:
Selfcare Sinners / Stable Ecommerce

Repository:
risejoaquin/stable-ecomerce

Branch:
main

Production:
https://selfcaresinners.com

Local Windows path:

C:\Users\Lucilfer\Documents\Stable-Ecommerce

Current reference commit when this file was created:

29657b687356d96db853b6bb5b6c67efa105c8c6

Commit message:

qa: establish automated quality gates

GitHub is the source of truth.

---

# Primary operating rule

When ChatGPT Web gives an instruction:

1. Execute the requested action exactly.
2. Do not expand the requested scope.
3. Do not make unrelated refactors.
4. Capture relevant stdout/stderr.
5. Report what changed.
6. Report test results.
7. Stop on non-trivial failures and return evidence to ChatGPT Web.

If the problem is simple and mechanical, Codex may fix it directly.

Examples of simple fixes:

- path correction;
- typo;
- missing import;
- script invocation issue;
- trivial syntax issue;
- line-ending issue;
- file permission/unblock issue;
- clearly requested one-line or isolated edit.

For architectural, security, payment, database, authentication, authorization, performance, migration, or multi-file behavioral issues:

STOP and report the evidence to ChatGPT Web unless an explicit implementation plan was already provided.

---

# Division of responsibilities

## ChatGPT Web owns

- architecture decisions;
- security remediation design;
- payment-flow decisions;
- database/security decisions;
- performance diagnosis;
- roadmap sequencing;
- scope definition;
- code design for significant changes;
- determining PASS / FAIL;
- determining when a phase is CLOSED;
- deciding when to commit;
- deciding when to push;
- deciding when to deploy;
- preparing larger patches or multi-file fixes.

## Codex owns

- inspecting local repository state;
- reading files requested by ChatGPT Web;
- executing PowerShell commands;
- executing npm commands;
- running Node scripts;
- running Playwright;
- running tests;
- running QA scripts;
- running builds;
- applying explicit simple edits;
- applying patches;
- checking Git state;
- staging exact files;
- committing when explicitly instructed;
- pushing when explicitly instructed;
- running deployment commands when explicitly instructed;
- collecting logs and evidence;
- reporting failures accurately.

---

# Communication protocol

After executing a task, report:

1. Commands executed.
2. Exit code when available.
3. PASS / FAIL for each step.
4. Relevant stdout/stderr.
5. Files modified.
6. `git status --short` if files changed.
7. `git diff --stat` if files changed.
8. Exact error text if something failed.

Do not summarize away important errors.

Never hide warnings that may affect correctness.

For very long logs:
- include the failure section;
- include final summaries;
- include relevant stack traces;
- include enough surrounding context to diagnose the issue.

---

# Failure protocol

If a non-trivial test or command fails:

1. Stop the current phase.
2. Do not continue to deployment.
3. Do not commit failed work unless explicitly instructed.
4. Do not invent a workaround.
5. Report the full relevant error.
6. Wait for ChatGPT Web to provide diagnosis or remediation.

Do not declare PASS because most tests passed.

PASS means all required gates for the requested task passed.

---

# Git safety rules

Never use:

git add .
git add -A
git push --force
git push -f
git reset --hard

unless ChatGPT Web explicitly instructs otherwise for a specific reason.

Prefer exact staging:

git add path/to/file1
git add path/to/file2

Before starting work:

git status
git fetch origin
git pull --ff-only origin main

Before commit:

git status --short
git diff --check
git diff --stat
git diff --cached --name-only

Before push:

git fetch origin
git rev-list --left-right --count HEAD...origin/main

Expected before a normal push after one local commit:

1    0

Push normally:

git push origin main

After push:

git status
git rev-parse HEAD
git rev-parse origin/main

HEAD and origin/main should match.

---

# Temporary files

Do not commit:

- generated QA artifacts;
- temporary patch README files;
- ad-hoc debug files;
- local logs;
- local secrets;
- `.env`;
- `.env.local`;
- temporary Lighthouse output;
- temporary Playwright output unless explicitly requested;
- `node_modules`;
- local context files unless explicitly requested.

Respect `.gitignore`.

---

# Dependency rules

npm is the canonical package manager.

Use:

npm ci

when:
- setting up a fresh machine;
- synchronizing node_modules to package-lock.json;
- ChatGPT Web explicitly requests it.

Do not run `npm install` unless dependencies are intentionally being changed.

Do not run:

npm audit fix
npm audit fix --force

without explicit instruction.

Current known dependency baseline:

- 2 moderate vulnerabilities
- 1 high vulnerability

These are pending controlled investigation.

---

# QA commands

Available QA scripts:

.\scripts\qa\validate-fast.ps1

.\scripts\qa\validate-release.ps1

.\scripts\qa\validate-all.ps1

.\scripts\qa\validate-production.ps1

.\scripts\qa\security\scan-local-secrets.ps1

.\scripts\qa\security\validate-security-baseline.ps1

.\scripts\qa\quality\validate-dependencies.ps1

.\scripts\qa\database\validate-database-security.ps1

---

# FAST gate

Expected FAST gate:

- TypeScript PASS
- Unit tests PASS
- Build PASS
- FINAL RESULT PASS

Run:

.\scripts\qa\validate-fast.ps1

---

# RELEASE gate

Expected RELEASE gate:

- TypeScript PASS
- Unit tests PASS
- Build PASS
- Secret scan PASS
- Security baseline report PASS
- Core regression PASS
- FINAL RESULT PASS

Run:

.\scripts\qa\validate-release.ps1

Security baseline `Report PASS` means the scanner executed correctly.

It does NOT mean all security findings are resolved.

---

# Current validated baseline

The following has already been locally validated:

- TypeScript PASS
- Unit tests PASS
- Build PASS
- Secret Scan PASS
- FAST PASS
- RELEASE PASS
- Core Regression PASS
- QA Automation Foundation CLOSED/PASS

Core regressions validated:

- smoke-qa-release-e
- smoke-mobile-ux-f
- smoke-post-ux-c-hotfix-20
- smoke-post-ux-c-hotfix-20-2

Do not reopen these without actual regression evidence.

---

# Security rules

Never expose or print:

- API secrets;
- passwords;
- private keys;
- Stripe live secret keys;
- webhook signing secrets;
- JWT signing secrets;
- database passwords;
- full session tokens;
- PAN;
- CVV.

Never serialize `password_hash`.

Do not weaken CSP by adding:

unsafe-inline

or:

unsafe-hashes

as a shortcut unless explicitly approved after analysis.

Do not bypass authentication or authorization for testing unless explicitly instructed.

---

# Known security findings

Current known security issues include:

## P0

SEC-001
Resend webhook signature verification missing.

## P1 / significant findings

SEC-002
Legacy `/api/upload` authorization.

SEC-003
Public `.select('*')` data overexposure.

SEC-004
verify-email response overexposure.

SEC-005
Login dedicated rate limiting.

SEC-006
CSP `unsafe-inline`.

SEC-007
Public `/api/log-error`.

SEC-008
JWT lifecycle / revocation.

SEC-009
Reusable password-reset token.

SEC-010
Weak password policy.

SEC-011
Email verification semantics.

SEC-012
Email-change reauthentication.

SEC-013
Store creation authorization.

SEC-014
Order tracking DTO overexposure.

SEC-015
Recover-cart token security.

SEC-016
Guest cart-sync abuse.

SEC-017
Telemetry metadata validation.

SEC-018 / SEC-019
Database RLS / SECURITY DEFINER / grants / policies pending live verification.

Do not mark these resolved unless the corresponding remediation and validation have actually passed.

---

# Database security

When database security validation is requested, inspect:

- RLS enabled state;
- policies;
- table grants;
- function grants;
- function owners;
- SECURITY DEFINER;
- search_path;
- EXECUTE permissions.

Critical functions include:

- decrement_stock
- consume_coupon_after_payment
- finalize_paid_order
- restock_refunded_item

Never modify production database privileges without explicit instruction.

---

# Payment safety

Stripe payment integrity is security-sensitive.

Do not modify payment flows, webhook ordering, idempotency, payment status transitions or checkout logic without an explicit plan.

Never log:

- PAN;
- CVV;
- Stripe secret keys;
- webhook secrets.

PCI DSS target:

technical readiness for PCI DSS 4.0.1.

Do not claim PCI certification.

---

# Performance baseline

POST-UX C Performance / LCP Closure remains OPEN / PAUSED.

Latest robust PDP LCP median:

approximately 2615.897 ms

Target:

<= 2500 ms

Approximate remaining gap:

115.897 ms

Do not revert HOTFIX 20 without evidence.

Preserve:

- PDP below-fold deferral;
- LCP image priority;
- server bootstrap improvements;
- stable vendor graph.

Do not repeat previously rejected experiments without new evidence.

---

# Project roadmap

Main audit sequence:

AUDIT-01 — Security and Payments

AUDIT-02 — Technical Performance

AUDIT-03 — Code Quality and Architecture

AUDIT-04 — Legal and Privacy

AUDIT-05 — UX, CRO and Accessibility

Do not invent additional audit phases.

ChatGPT Web decides sequencing and completion.

---

# Current next objective

Immediate sequence:

1. verify GitHub Actions result;
2. verify Railway deployment;
3. validate production;
4. begin AUDIT-01;
5. prioritize SEC-001 Resend webhook signature verification.

Codex should not begin security remediation independently unless ChatGPT Web provides the implementation instructions.

---

# Scope discipline

Do not perform opportunistic refactors.

Do not update dependencies simply because newer versions exist.

Do not rewrite working modules during an unrelated fix.

Do not change formatting across entire files unless required.

Prefer the smallest correct change.

Every defect fix should ideally have a permanent regression test or validation.

---

# Evidence standard

A phase can only be considered PASS when the required evidence exists.

Code existing is not proof.

A script existing is not proof.

A build passing does not prove runtime behavior.

A local test does not automatically prove production.

Production changes require production validation when the roadmap requires it.

Codex reports evidence.

ChatGPT Web makes the final PASS/CLOSED decision.


# ChatGPT Web handoff

If the user says that the output will be sent to ChatGPT Web:

- provide raw technical evidence;
- avoid unnecessary explanations;
- preserve exact error messages;
- include file paths and line numbers;
- include commands executed;
- include final PASS/FAIL summary.

ChatGPT Web will perform the diagnosis and provide the next instruction.