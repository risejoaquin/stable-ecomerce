# POST-LAUNCH 20 - PL20-03B Reviewed Security Evidence Contract

Date: 2026-09-19
Mode: READ-ONLY / DESIGN
Current main provided by ChatGPT Web: `64696209a26efec83ae1ae7c3c3800801fa3d8ef`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This document defines the reviewed security evidence required for PL20 to legitimately evaluate `security_blockers.open_count` without overclaiming existing CI scans.

No application code, tests, workflow YAML, Supabase resources, production resources, current-task, handoff, or validation files were modified.

## Part 1 - Current Security Sources

| Source | Current Evidence | Scope | Contribution | Limitation |
|---|---|---|---|---|
| Secret scan | `scripts/qa/security/scan-local-secrets.ps1`; Quality Gate step `Secret scan` | Scans git-tracked text/source/config/docs for configured secret patterns such as Stripe keys, Stripe webhook secrets, Resend API keys, GitHub tokens, and private key blocks | Can prove no configured secret pattern was detected in the scanned repository snapshot when the scan passes | Does not inspect provider dashboards, runtime env vars, GitHub secrets, Railway variables, Supabase secrets, historical git leaks, dependency vulnerabilities, auth logic, RLS, payment flows, or application security blockers outside its regex set |
| Security baseline report | `scripts/qa/security/validate-security-baseline.ps1`; Quality Gate step `Security baseline report` | Source-contract checks for known baseline findings, including Resend webhook verification, legacy upload admin protection, public synchronous log-error route, and CSP `unsafe-inline` | Can contribute known finding status for the specific checks implemented by the script | Report mode is not a full security audit. A clean script execution is not proof that all security blockers are zero. Findings and mode must be inspected |
| Core regression contracts | `scripts/qa/regression/validate-regression-core.ps1`; Quality Gate step `Core regression contracts` | Runs established regression smoke contracts such as QA release, mobile UX, and POST-UX hotfix contracts | Can prove selected user-facing and regression contracts did not break | Not a security blocker inventory. Does not prove no auth, authorization, payment, database, dependency, or operational security blocker exists |
| Known issues | `AGENT_CONTEXT/09_KNOWN_ISSUES.md` | Current open project risks, including PL20 static seeded values, missing high-volume load testing, pending external connectors, and dependency baseline | Must be reviewed as a contradiction source before any zero-blocker claim | The file is an inventory, not a formal reviewed security manifest. It currently documents `2 moderate and 1 high` npm audit vulnerability |
| Existing PL20 security evidence | PL20-02 trust-boundary evidence and PL20-03 trusted CI artifact plans under `AGENT_CONTEXT/evidence/post-launch-20/` | Defines that request-body/admin assertions cannot originate trusted CI evidence and that missing security blocker evidence stays `NOT_MEASURED` | Establishes the trust boundary for future evidence classification | Does not itself review current security blockers or prove `critical_open_count = 0` |
| Dependency vulnerability evidence | `AGENT_CONTEXT/09_KNOWN_ISSUES.md`; Block C infrastructure/security evidence documenting npm audit baseline | Documents known dependency risk, including `2 moderate and 1 high` vulnerabilities and production-only high `multer` exposure in prior evidence | Must feed the reviewed manifest as active vulnerability context | Cannot be ignored by a zero-blocker assertion. Requires controlled review to determine whether each item is critical, high, accepted, remediated, or out of scope |
| Supabase/security remediation evidence | Block C Supabase remediation and production validation evidence | Specific live RPC and database security remediations were validated for targeted functions and grants | Can support closure of specific database security findings | Does not prove all current application security blockers are zero outside the validated scope |
| Resend webhook and legacy upload validators | Last validation and security baseline evidence | Specific controls for Resend webhook signature verification and legacy upload authorization | Can support those specific controls as reviewed source inputs | Cannot be generalized into global security readiness or zero blockers |

## Part 2 - Reviewed Security Manifest

Future reviewed security evidence should be represented as:

```text
pl20-evidence/reviewed-security.json
```

Required shape:

```json
{
  "schema_version": "pl20-reviewed-security-v1",
  "repository": "risejoaquin/stable-ecomerce",
  "validated_commit_sha": "FULL_COMMIT_SHA",
  "reviewed_at": "ISO_TIMESTAMP",
  "reviewer_class": "chatgpt_web|human_operator|security_reviewer|codex_operator",
  "scope": {
    "included": [
      "committed_secret_scan",
      "security_baseline_findings",
      "core_regression_contracts",
      "known_issues_inventory",
      "dependency_vulnerability_baseline",
      "pl20_trust_boundary"
    ],
    "excluded": [],
    "time_window_start": "ISO_TIMESTAMP_OR_NULL",
    "time_window_end": "ISO_TIMESTAMP_OR_NULL"
  },
  "sources": [
    {
      "source_type": "ci_secret_scan",
      "reference": "GITHUB_RUN_OR_ARTIFACT_REFERENCE",
      "status": "PASS|FAIL|NOT_MEASURED|STALE",
      "commit_sha": "FULL_COMMIT_SHA",
      "limitations": []
    },
    {
      "source_type": "security_baseline_report",
      "reference": "GITHUB_RUN_OR_ARTIFACT_REFERENCE",
      "status": "PASS|FAIL|PASS_WITH_FINDINGS|NOT_MEASURED|STALE",
      "commit_sha": "FULL_COMMIT_SHA",
      "findings": []
    },
    {
      "source_type": "known_issues_inventory",
      "reference": "AGENT_CONTEXT/09_KNOWN_ISSUES.md",
      "status": "REVIEWED|CONFLICTING|STALE",
      "open_items": []
    },
    {
      "source_type": "dependency_vulnerability_review",
      "reference": "NPM_AUDIT_OR_REVIEW_REFERENCE",
      "status": "REVIEWED|CONFLICTING|STALE|NOT_MEASURED",
      "open_items": []
    }
  ],
  "critical_open_count": 0,
  "high_open_count": 0,
  "known_exceptions": [],
  "caveats": [],
  "status": "PASS|FAIL|PARTIAL|NOT_MEASURED|STALE"
}
```

Rules:

- No numeric security score is allowed.
- `critical_open_count` and `high_open_count` must be explicit integers when measured.
- If either count is unknown, use `null` and set `status` to `NOT_MEASURED` or `PARTIAL`.
- `scope.included` must identify what was reviewed.
- `scope.excluded` must identify exclusions that prevent global zero-blocker claims.
- `known_exceptions` must not hide active critical blockers.
- `caveats` must disclose limits such as report mode, partial dependency review, stale runs, or source gaps.

## Part 3 - Zero Blocker Rule

PL20 may evaluate:

```text
security_blockers.open_count = 0
```

only when all of the following are true:

1. A reviewed security manifest exists.
2. The manifest is current for the evaluated release.
3. `validated_commit_sha` matches the target commit, or ChatGPT Web explicitly accepts timestamp-bound evidence for a non-commit-bound source.
4. `reviewed_at` is inside the approved freshness window.
5. `reviewer_class` is an approved class.
6. The evidence did not originate from caller/admin request body.
7. The reviewed scope covers the PL20 security blocker scope.
8. The manifest includes current source review for secret scan, security baseline report, core regression contracts, known issues, dependency vulnerabilities, and PL20 trust-boundary evidence.
9. `critical_open_count` is explicitly `0`.
10. No contradictory active critical finding exists in known issues, security baseline findings, dependency review, PL20 evidence, or current validation records.
11. High findings are explicitly counted in `high_open_count` and either resolved, accepted with a documented exception, or left as a caveat for ChatGPT Web to classify.
12. Manifest `status` is `PASS`.

Missing review:

```text
security_blockers.open_count = null
security_blockers.measured_state = NOT_MEASURED
```

Contradictory evidence:

```text
security_blockers.status = FAIL
```

or:

```text
security_blockers.status = PARTIAL
```

depending on whether the contradiction is confirmed or unresolved.

Contradictory evidence must never produce `PASS`.

## Part 4 - CI Evidence Relationship

CI security evidence can contribute to the reviewed manifest but cannot independently prove zero blockers.

| CI Evidence | Valid Contribution | Must Not Be Overclaimed As |
|---|---|---|
| Secret scan | No configured committed-secret pattern detected in the scanned snapshot | No secrets exist anywhere; no security blockers exist |
| Security baseline report | Specific baseline checks ran and produced inspectable findings/status | Global security audit; zero critical blockers |
| Core regression contracts | Selected product and regression contracts still pass | Security audit; authorization/payment/database readiness |

Trusted CI artifacts may become source entries only after independent importer verification. That importer verification may establish:

```text
origin = persisted_trusted_import
classification = VERIFIED_CI_EVIDENCE
```

The reviewed security manifest must then aggregate and interpret those CI sources under:

```text
origin = reviewed_security
classification = REVIEWED_SECURITY_EVIDENCE
```

## Part 5 - Trust Origin

Future persisted reviewed security evidence must use:

```text
origin = reviewed_security
classification = REVIEWED_SECURITY_EVIDENCE
```

Caller/admin request bodies cannot self-declare this origin or classification.

Any request-body assertion that claims reviewed security status must be downgraded to an untrusted source such as:

```text
origin = request_body
classification = UNTRUSTED_ASSERTION
measured_state = NOT_MEASURED
```

Trusted reviewed security evidence may be persisted only after a controlled reviewer/import path verifies:

- repository;
- target commit or accepted timestamp;
- reviewer class;
- source references;
- source freshness;
- explicit counts;
- absence of contradictory active critical evidence;
- manifest schema version.

Recommended provisional JSONB representation:

```json
{
  "evidence": {
    "reviewed_security": {
      "classification": "REVIEWED_SECURITY_EVIDENCE",
      "origin": "reviewed_security",
      "validated_commit_sha": "FULL_COMMIT_SHA",
      "reviewed_at": "ISO_TIMESTAMP",
      "reviewer_class": "chatgpt_web|human_operator|security_reviewer|codex_operator",
      "critical_open_count": 0,
      "high_open_count": 0,
      "manifest_reference": "pl20-evidence/reviewed-security.json",
      "sources": [],
      "known_exceptions": [],
      "caveats": []
    }
  },
  "metadata": {
    "source": "reviewed_security_manifest",
    "source_type": "reviewed_security",
    "origin": "reviewed_security",
    "classification": "REVIEWED_SECURITY_EVIDENCE",
    "measured_state": "MEASURED",
    "calculation_version": "pl20-reviewed-security-v1",
    "validated_commit_sha": "FULL_COMMIT_SHA",
    "reviewed_at": "ISO_TIMESTAMP",
    "idempotency_key": "security_blockers:reviewed_security:FULL_COMMIT_SHA:ISO_TIMESTAMP"
  }
}
```

## Part 6 - Acceptance

### Security Blocker Evidence Current

Evidence is current when:

- the manifest exists;
- schema version is accepted;
- `validated_commit_sha` matches the evaluated commit, or a timestamp-bound source has explicit ChatGPT Web approval;
- `reviewed_at` is inside the approved freshness threshold;
- required source references are present;
- source commits/runs are not older than the evaluated release unless explicitly accepted;
- known issues and dependency evidence have been reviewed after their latest relevant update;
- no newer contradictory security evidence exists.

### Security Blocker Evidence Stale

Evidence is stale when:

- `validated_commit_sha` does not match the evaluated commit;
- `reviewed_at` exceeds the freshness threshold;
- source artifacts or runs reference an older commit without approved carry-forward;
- known issues changed after the review;
- dependency vulnerability evidence changed after the review;
- the security baseline or secret scan source is missing for the target release.

Stale evidence must not produce `PASS`.

### Security Blocker Evidence Conflicting

Evidence is conflicting when:

- the manifest claims zero critical blockers while another current source lists an active critical security issue;
- security baseline findings contradict the manifest counts;
- known issues document an unresolved critical blocker omitted from the manifest;
- dependency review records a critical item omitted from counts or exceptions;
- CI source status is failed, stale, skipped, or not measured while the manifest treats it as pass;
- request-body evidence attempts to impersonate reviewed evidence.

Confirmed critical conflict:

```text
status = FAIL
```

Unresolved or scope-limited conflict:

```text
status = PARTIAL
```

Never map conflicting evidence to `PASS`.

### Security Blockers PASS

Security blockers may be considered `PASS` only when:

- evidence origin is `reviewed_security`;
- classification is `REVIEWED_SECURITY_EVIDENCE`;
- manifest status is `PASS`;
- evidence is current;
- scope covers the PL20 security blocker scope;
- `critical_open_count = 0`;
- no contradictory active critical evidence exists;
- high vulnerabilities and known exceptions are explicitly counted and reviewed;
- ChatGPT Web accepts any caveats that remain.

### Security Blockers NOT_MEASURED

Security blockers remain `NOT_MEASURED` when:

- no reviewed security manifest exists;
- manifest lacks explicit counts;
- source review is missing;
- origin is request body/admin assertion;
- source freshness cannot be established;
- scope is undefined.

## Implementation Prerequisites

Before implementation, ChatGPT Web must approve:

- allowed `reviewer_class` values;
- freshness threshold;
- whether high vulnerabilities block PL20 readiness or remain reviewed caveats;
- minimum required source set;
- where reviewed manifests are produced and imported;
- who may perform the reviewed security assessment;
- how exceptions are accepted and expired.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- current security source inventory;
- reviewed security manifest design;
- zero blocker rule;
- CI evidence relationship;
- trust origin requirements;
- acceptance criteria for current, stale, conflicting, PASS, and NOT_MEASURED states.
