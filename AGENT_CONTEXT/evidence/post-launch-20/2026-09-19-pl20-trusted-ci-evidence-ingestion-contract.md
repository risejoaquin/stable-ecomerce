# POST-LAUNCH 20 - Trusted CI Evidence Ingestion Contract

Date: 2026-09-19
Mode: READ-ONLY / DESIGN
Current main provided by ChatGPT Web: `dbea84b94098e31e04e930f209f480f87cfb0b6a`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This document defines how real GitHub Actions evidence should eventually enter PL20 without allowing runtime/admin assertions to impersonate CI evidence.

No workflow YAML, application code, tests, QA scripts, Supabase schema, production data, current task, handoff, or last-validation files were modified.

## Part A - Current Workflow Inventory

Current workflow files:

- `.github/workflows/quality-gate.yml`
- `.github/workflows/production-smoke.yml`

### Workflow Evidence Matrix

| Evidence Dimension | Workflow Name | Trigger | Commit SHA Available? | Run ID Available? | Conclusion Field | Artifact Availability | Tied To Deployed Commit? |
|---|---|---|---|---|---|---|---|
| release gate | `Selfcare Quality Gate` | `push` to `main`, `pull_request` to `main` | Yes, via GitHub workflow run `head_sha` / `github.sha` | Yes, via GitHub Actions run metadata | Yes, workflow run/job/step conclusion from GitHub API/UI | No upload-artifact step currently defined | No. It validates pushed/PR commit, not deployment. |
| build | `Selfcare Quality Gate` | Same as above | Yes | Yes | Yes; step named `Build` runs `npm run build` | No artifact currently uploaded | No, unless the same SHA is later deployed and cross-checked. |
| unit/API tests | `Selfcare Quality Gate` | Same as above | Yes | Yes | Yes; step named `Unit tests` runs `npm test` | No artifact currently uploaded | No, unless same SHA is later deployed and cross-checked. |
| TypeScript/lint | `Selfcare Quality Gate` | Same as above | Yes | Yes | Yes; step named `TypeScript` runs `npm run lint` | No artifact currently uploaded | No, unless same SHA is later deployed and cross-checked. |
| secret scan | `Selfcare Quality Gate` | Same as above | Yes | Yes | Yes; step named `Secret scan` runs `scan-local-secrets.ps1` | No artifact currently uploaded | No, unless same SHA is later deployed and cross-checked. |
| core regression | `Selfcare Quality Gate` | Same as above | Yes | Yes | Yes; step named `Core regression contracts` | No artifact currently uploaded | No, unless same SHA is later deployed and cross-checked. |
| security baseline report | `Selfcare Quality Gate` | Same as above | Yes | Yes | Yes; step named `Security baseline report` | No artifact currently uploaded | No, unless same SHA is later deployed and cross-checked. |
| E2E | None in current workflows | Not configured | No CI evidence in current workflow set | No | No | No | No |
| production smoke | `Selfcare Production Smoke` | `deployment_status` with `states: [success]`; `workflow_dispatch` with optional `commit` | Yes. `deployment_status` uses `github.event.deployment.sha`; manual uses input `commit` or `github.sha` | Yes, via GitHub Actions run metadata | Yes, workflow run/job/step conclusion | No artifact currently uploaded | Yes only when `expected_commit` equals deployed SHA and `validate-production.ps1 -ExpectedCommit` passes. |

### Workflow Notes

- `Selfcare Quality Gate` is the authoritative CI workflow for lint/build/unit tests/secret scan/core regression/security baseline.
- Current workflows do not run Playwright E2E in GitHub Actions. E2E cannot be marked `PASS` from trusted CI unless a workflow later runs it or a separate trusted source is approved.
- `Selfcare Production Smoke` validates production against an expected commit resolved from deployment status/manual input. It is the only current workflow designed to tie evidence to deployed production version.
- Neither workflow uploads structured evidence artifacts today. Any future ingestion must therefore use GitHub run/job/step metadata, logs, or a newly approved artifact/manifest design.

## Part B - Trust Contract

Trusted CI evidence must be recorded as `VERIFIED_CI_EVIDENCE`.

### Schema

| Field | Required | Description |
|---|---|---|
| `dimension` | yes | PL20 evidence dimension, e.g. `technical.build.status`, `technical.unit_tests.status`, `technical.secret_scan.status`, `technical.production_smoke.status`. |
| `status` | yes | One of `PASS`, `FAIL`, `STALE`, `NOT_MEASURED`. |
| `validated_commit_sha` | yes | Full commit SHA validated by the workflow. |
| `workflow_name` | yes | Exact GitHub Actions workflow name. |
| `workflow_run_id` | yes | GitHub Actions run ID. |
| `workflow_attempt` | yes | GitHub Actions run attempt number. |
| `event` | yes | GitHub event name, e.g. `push`, `pull_request`, `deployment_status`, `workflow_dispatch`. |
| `measured_at` | yes | Timestamp when GitHub marked the run/attempt completed, or ingestion timestamp with source completion timestamp. |
| `source_type` | yes | Must be `github_actions_verified`. |
| `evidence_reference` | yes | GitHub run URL, artifact URL, or immutable evidence manifest path. |
| `conclusion` | yes | GitHub conclusion, e.g. `success`, `failure`, `cancelled`, `skipped`, `timed_out`, `neutral`, `action_required`, `startup_failure`. |
| `provenance_version` | yes | Contract version, e.g. `pl20-ci-evidence-v1`. |

### Allowed Statuses

| Status | Meaning |
|---|---|
| `PASS` | GitHub evidence was found for the exact required dimension and commit, final conclusion is `success`, and freshness/deployed-commit rules are satisfied. |
| `FAIL` | Evidence exists for the dimension/commit, but final conclusion is failure-like or required step failed. |
| `STALE` | Evidence exists but does not match the required commit, deployment, attempt, or freshness window. |
| `NOT_MEASURED` | No trusted CI evidence exists for the dimension. |

Numeric scores are forbidden for trusted CI evidence. PL20 must consume status and provenance only.

## Part C - Ingestion Options

| Option | Description | Trust Strength | Complexity | Secret Requirements | Replay Risk | Availability Dependency | Auditability |
|---|---|---|---|---|---|---|---|
| 1 | GitHub Action writes signed/internal evidence to application endpoint | High if endpoint authenticates GitHub OIDC or tightly scoped secret and validates run context | High | Requires app endpoint secret or OIDC trust setup | Medium if payload can be replayed without nonce/run validation | Depends on app uptime during CI | High if immutable records are stored |
| 2 | GitHub Action produces artifact and controlled operator imports it | High if artifact is fetched from GitHub by run ID/attempt and commit is validated | Medium | Operator/GitHub read access; no app write secret during CI | Low/medium; import must prevent old artifact reuse | Depends on GitHub artifact retention and operator step | High, artifact is reviewable |
| 3 | ChatGPT/agent reads GitHub and persists validated evidence | Medium/high if using GitHub API and exact run metadata; lower if manual transcription | Medium | Requires GitHub read access and later app/DB write approval | Medium; agent must validate commit/run/attempt every time | Depends on agent/tool access and GitHub availability | Medium/high if raw API output is saved |
| 4 | Repository evidence manifest committed after CI | Medium. Strong review trail, but commit can lag and can be manually edited | Medium | Git push permission; no app endpoint secret | Medium/high unless manifest references immutable run IDs and is reviewed | Depends on Git and CI discipline | High in Git history, lower as real-time source |

### Preferred Architecture

Preferred design: option 2 as the first implementation path, with optional evolution toward option 1.

Rationale:

- It avoids exposing an application ingestion endpoint during early PL20 hardening.
- It keeps GitHub Actions as the source of truth.
- It allows ChatGPT Web/operator review before evidence is persisted.
- It reduces blast radius if production is unavailable during CI.
- It can require exact `workflow_run_id`, `workflow_attempt`, `head_sha`, and step conclusions at import time.

Implementation remains blocked until ChatGPT Web approves:

- final storage location;
- GitHub API/artifact access method;
- retention policy;
- import authority;
- replay protections;
- production-smoke commit-selection rules.

## Part D - Production Smoke Special Case

Production smoke has a known deployment-status race history and must be treated more strictly than ordinary CI.

Trusted production-smoke evidence must:

- identify exact `head_sha` / `expected_commit`;
- require a final successful run;
- distinguish earlier race failure or skipped/no-run states;
- never translate skipped/no-run into `PASS`;
- tie evidence to the deployed version.

### Selection Algorithm

Inputs:

- target deployed commit SHA;
- GitHub workflow name: `Selfcare Production Smoke`;
- acceptable events: `deployment_status`, `workflow_dispatch` only if explicitly approved;
- production base URL: `https://selfcaresinners.com`;
- expected environment: production deployment evidence.

Algorithm:

1. Collect all runs for workflow `Selfcare Production Smoke`.
2. Keep only runs with `status = completed`.
3. Exclude runs with conclusion `skipped`, `cancelled`, `timed_out`, `neutral`, `action_required`, `startup_failure`, or missing conclusion.
4. Resolve the run's intended commit:
   - for `deployment_status`, use `github.event.deployment.sha` / resolved `expected_commit`;
   - for `workflow_dispatch`, use provided `commit` input if present, otherwise `github.sha`.
5. Keep only runs where resolved expected commit equals target deployed commit SHA.
6. Require the `Validate production` step to complete successfully.
7. Require validation to include `-ExpectedCommit` equal to the target deployed commit.
8. If multiple runs match, select the latest completed successful run by completion timestamp and highest run attempt.
9. If an earlier run for the same deployment failed/skipped because of a race but a later matching run succeeded, record the earlier run as historical failure/race and the later run as current `PASS`.
10. If no matching successful completed run exists, status is `NOT_MEASURED` or `FAIL`, never `PASS`.

Manual `workflow_dispatch` production-smoke evidence may be accepted only when ChatGPT Web approves the manual rerun and the expected commit matches deployed production.

## Part E - Replay / Spoof Protection

Required controls:

| Threat | Control |
|---|---|
| Old CI run reused for new deployment | `validated_commit_sha` must equal current target commit/deployed SHA. Stale mismatch maps to `STALE`. |
| Manual fabricated run ID | Ingestion must fetch run metadata from GitHub by ID and verify workflow name, repo, attempt, event, conclusion, and head SHA. |
| Commit mismatch | Any mismatch between PL20 target commit, workflow head SHA, deployment SHA, or expected commit forces `STALE` or `FAIL`. |
| Workflow failure followed by unrelated success | Success must be same workflow, same dimension, same commit, and same required event class. Unrelated success cannot repair failure. |
| Duplicate ingestion | Use idempotency key: `dimension + workflow_run_id + workflow_attempt + validated_commit_sha`. Duplicate should update only if identical or ignore safely. |
| Out-of-order deployment events | Evidence selection must sort by deployment target commit and completion timestamp, not by ingestion time alone. |
| Skipped/no-run impersonates success | `skipped`, missing, or absent workflow run maps to `NOT_MEASURED`, never `PASS`. |
| Runtime/admin assertion impersonates CI | Application/admin endpoints may report only imported verified CI records, not self-assert CI status. |
| Re-run attempt ambiguity | Store `workflow_attempt`; prefer latest successful attempt for same run only when GitHub marks it completed and matching commit. |

Crypto/signatures are not required for V1 if evidence is imported from GitHub by authenticated API/artifact lookup and validated against run metadata. If direct app endpoint ingestion is selected later, GitHub OIDC or a short-lived signed payload should be considered.

## Part F - Security Blocker Evidence Policy

Authoritative possible sources:

| Source Class | Can Contribute? | Can Satisfy `security_blockers.open_count = 0` Alone? | Notes |
|---|---|---|---|
| Security audit evidence file | Yes | Yes, if current, reviewed, and explicitly states critical blocker count | Must include date, scope, commit, reviewer/source, and known caveats. |
| Dependency/security workflow | Yes | Yes for dependency/scan dimensions it covers | Must be trusted CI evidence tied to commit. |
| Current known-issues inventory | Yes | Yes only if it is current and explicitly reviewed for critical blockers | Stale inventory cannot satisfy zero blockers. |
| Manual reviewed security assessment | Yes | Yes if ChatGPT Web/user-approved and evidence file records scope and reviewer | Must not be a casual runtime/admin assertion. |
| Runtime/admin endpoint claim | Informational only | No | May display imported evidence but cannot originate trusted zero-blocker proof. |
| Missing evidence | No | No | Must remain `NOT_MEASURED`. |

Rules:

- `security_blockers.open_count = 0` requires at least one authoritative current source and no contradictory current source.
- If dependency audit has unresolved high/critical findings, the blocker policy must classify by severity and scope rather than compressing into PASS.
- If source classes disagree, status becomes `PARTIAL`/`FAIL` for security readiness until ChatGPT Web resolves the conflict.
- Missing security evidence must remain `NOT_MEASURED`.

## Implementation Prerequisites

Before implementation, ChatGPT Web must approve:

- selected ingestion architecture;
- source of truth for GitHub run lookup;
- exact freshness window;
- mapping from workflow steps to PL20 dimensions;
- whether E2E must be added to GitHub Actions before PL20 can mark it trusted CI `PASS`;
- production-smoke manual rerun policy;
- evidence storage table/file/API shape;
- import actor permissions;
- replay/idempotency behavior;
- security blocker authority hierarchy.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- workflow inventory;
- verified evidence schema;
- ingestion option comparison;
- preferred architecture;
- production-smoke race handling;
- replay/spoof controls;
- security blocker evidence policy;
- implementation prerequisites.
