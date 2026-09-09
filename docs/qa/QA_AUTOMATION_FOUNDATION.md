# Selfcare Sinners — QA Automation Foundation

## Purpose

This layer consolidates existing QA scripts into repeatable local and CI gates without deleting historical smoke tests.

## Local commands

```powershell
.\scripts\qa\validate-fast.ps1
.\scripts\qa\security\validate-security-baseline.ps1 -Mode Report
.\scripts\qa\regression\validate-regression-core.ps1
.\scripts\qa\validate-release.ps1
.\scripts\qa\validate-all.ps1
```

After a Railway deployment completes:

```powershell
.\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com"
```

## Gates

### FAST

- TypeScript
- unit tests
- build

### RELEASE

- FAST-equivalent checks
- security baseline report
- current core regression contracts

The security baseline is initially **report mode**, because AUDIT-01 already contains known P0/P1 findings. Once AUDIT-01 remediates them, CI/release can switch to `-Mode Enforce`.

### ALL

- release gate
- dependency consistency/advisory report

## Evidence

Each orchestrated run writes:

```text
artifacts/qa/<timestamp>-<suite>/
  summary.md
  summary.json
  *.log
```

`artifacts/qa/` is local evidence and should not be committed.

## CI

`.github/workflows/quality-gate.yml` runs on push and pull request using Windows, Node 22, `npm ci`, lint, unit tests, build, static regression contracts, and a non-blocking known-finding security baseline.

## Future activation

During AUDIT-01:

1. fix Resend webhook verification;
2. add dynamic negative webhook tests;
3. close legacy upload/data-exposure/CSP/log endpoint findings;
4. change security baseline from Report to Enforce;
5. add database privilege validation once a safe test DB connection is available.

During AUDIT-05, extend existing Playwright tests with accessibility automation. `@playwright/test` already exists, so no Playwright dependency is added by this foundation.
