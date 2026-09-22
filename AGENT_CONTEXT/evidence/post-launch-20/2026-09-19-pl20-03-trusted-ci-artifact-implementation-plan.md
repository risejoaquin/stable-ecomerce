# POST-LAUNCH 20 - PL20-03 Trusted CI Artifact Implementation Plan

Date: 2026-09-19
Mode: READ-ONLY / DESIGN / NO IMPLEMENTATION
Current main provided by ChatGPT Web: `6a2b265bc29601c1f2143bf4b99a7a7b9e637e6d`
Formal state: PL20-01 PASS; PL20-02 PASS; PL20-03 ACTIVE
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This plan turns the approved CI manifest design into an exact implementation plan that Antigravity can implement after PL20-03A without weakening PL20-02 trust boundaries.

No workflow YAML, application code, tests, Supabase schema, production data, current-task, handoff, or validation files were modified.

## Trust Boundary

Trusted CI evidence must originate from GitHub Actions run metadata, job/step conclusions, and run artifacts. Application runtime/admin assertions may display imported evidence but must not originate trusted CI evidence.

Only after importer verification may evidence use:

```text
origin = persisted_trusted_import
classification = VERIFIED_CI_EVIDENCE
```

No numeric scores. Use `PASS`, `FAIL`, `STALE`, `NOT_MEASURED`.

## Part 1 - Quality Gate Workflow Delta

Target file for future implementation:

```text
.github/workflows/quality-gate.yml
```

Design goals:

- retain existing Quality Gate dimensions;
- add real Playwright E2E execution;
- generate `pl20-evidence/quality-gate.json`;
- generate `pl20-evidence/e2e.json`;
- upload artifacts named with `run_id` and `run_attempt`;
- never mark E2E `PASS` unless `npm run test:e2e` actually executes successfully.

Existing dimensions to preserve:

- `release_gate`
- `build`
- `unit_tests`
- `secret_scan`
- `core_regression`
- `security_baseline`

New dimension:

- `e2e`

Proposed new/changed steps inside Quality Gate workflow:

```yaml
      - name: Install Playwright Chromium
        run: npx playwright install chromium

      - name: Playwright E2E
        run: npm run test:e2e
        env:
          CI: true

      - name: Generate PL20 Quality Gate Evidence
        if: always()
        shell: pwsh
        run: |
          New-Item -ItemType Directory -Force -Path pl20-evidence | Out-Null
          # Implementation should derive statuses from actual GitHub job/step outcomes,
          # not manually supplied PASS values.
          # See manifest schema in this plan.

      - name: Upload PL20 Quality Gate Evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pl20-evidence-quality-gate-${{ github.run_id }}-${{ github.run_attempt }}
          path: pl20-evidence/
          retention-days: 30
```

Important implementation note:

- GitHub expressions such as `${{ steps.<id>.conclusion }}` require stable step `id` values. Antigravity should assign IDs to evidence-bearing steps, e.g. `id: build`, `id: unit_tests`, `id: secret_scan`, `id: core_regression`, `id: security_baseline`, `id: e2e`.
- Manifest generation must run under `if: always()` so failures produce evidence. Failed steps must map to `FAIL`, not disappear.

## Part 2 - E2E Job Design

Recommended design: separate `e2e` job that depends on the main `quality` job's install/build pattern but does not require production secrets.

Rationale:

- Cleanly separates unit/build/security evidence from browser E2E runtime.
- Lets E2E have its own timeout and artifact evidence.
- Avoids hiding E2E failure inside a large monolithic job.
- Allows Quality Gate release status to require both `quality` and `e2e` jobs before `release_gate = PASS`.

Dependency/correlation rule:

- Both jobs must run on the same `github.sha`, `github.run_id`, and `github.run_attempt`.
- `release_gate = PASS` only if required Quality Gate job and E2E job both conclude `success`.

Proposed job outline:

```yaml
  e2e:
    runs-on: windows-latest
    timeout-minutes: 20
    env:
      CI: true
      # Do not define Stripe live, Resend live, Supabase production service role,
      # or production DB variables here.
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install locked dependencies
        run: npm ci

      - name: Build
        id: e2e_build
        run: npm run build

      - name: Install Playwright Chromium
        id: playwright_install
        run: npx playwright install chromium

      - name: Playwright E2E
        id: e2e
        run: npm run test:e2e

      - name: Generate PL20 E2E Evidence
        if: always()
        shell: pwsh
        run: |
          New-Item -ItemType Directory -Force -Path pl20-evidence | Out-Null
          # Write pl20-evidence/e2e.json from actual step/job conclusions.

      - name: Upload PL20 E2E Evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pl20-evidence-e2e-${{ github.run_id }}-${{ github.run_attempt }}
          path: pl20-evidence/e2e.json
          retention-days: 30
```

Environment restrictions:

- No Stripe live secret.
- No Resend live API key.
- No Supabase production service role.
- No production database URL.
- No production checkout/payment environment.

Observed current E2E design:

- `playwright.config.ts` uses `baseURL: http://localhost:3000`.
- `webServer.command` is `npm run start`.
- `npm run start` requires a prior `npm run build`.
- Chromium is the only configured browser project.

## Part 3 - Manifest Generator

Generator inputs:

- `github.repository`
- `github.workflow`
- `github.run_id`
- `github.run_attempt`
- `github.event_name`
- `github.sha`
- job/step conclusions from GitHub Actions context;
- timestamp at manifest generation;
- workflow/job conclusion if available.

Generator outputs:

```text
pl20-evidence/quality-gate.json
pl20-evidence/e2e.json
```

Required identity fields:

- `repository`
- `workflow_name`
- `workflow_run_id`
- `workflow_attempt`
- `event`
- `head_sha`
- `conclusion`
- `completed_at`

Dimension status rules:

- `PASS` only from actual successful job/step result.
- `FAIL` from failure/cancelled/timed-out/action-required or explicit failed step.
- `NOT_MEASURED` if the step never existed or did not execute.
- `STALE` is normally assigned by importer when commit/run mismatch is detected, not by the workflow.

No manually supplied PASS.

### `quality-gate.json` Shape

```json
{
  "schema_version": "pl20-ci-evidence-v1",
  "repository": "risejoaquin/stable-ecomerce",
  "workflow_name": "Selfcare Quality Gate",
  "workflow_run_id": 123456789,
  "workflow_attempt": 1,
  "event": "push",
  "head_sha": "FULL_COMMIT_SHA",
  "started_at": "ISO_TIMESTAMP_OR_NULL",
  "completed_at": "ISO_TIMESTAMP",
  "conclusion": "success",
  "dimensions": {
    "release_gate": {
      "status": "PASS",
      "step_name": "quality+e2e aggregate",
      "conclusion": "success"
    },
    "build": {
      "status": "PASS",
      "step_name": "Build",
      "conclusion": "success"
    },
    "unit_tests": {
      "status": "PASS",
      "step_name": "Unit tests",
      "conclusion": "success"
    },
    "secret_scan": {
      "status": "PASS",
      "step_name": "Secret scan",
      "conclusion": "success"
    },
    "core_regression": {
      "status": "PASS",
      "step_name": "Core regression contracts",
      "conclusion": "success"
    },
    "security_baseline": {
      "status": "PASS",
      "step_name": "Security baseline report",
      "conclusion": "success"
    },
    "e2e": {
      "status": "PASS",
      "step_name": "Playwright E2E",
      "conclusion": "success"
    }
  }
}
```

### `e2e.json` Shape

```json
{
  "schema_version": "pl20-ci-evidence-v1",
  "repository": "risejoaquin/stable-ecomerce",
  "workflow_name": "Selfcare Quality Gate",
  "workflow_run_id": 123456789,
  "workflow_attempt": 1,
  "event": "push",
  "head_sha": "FULL_COMMIT_SHA",
  "started_at": "ISO_TIMESTAMP_OR_NULL",
  "completed_at": "ISO_TIMESTAMP",
  "conclusion": "success",
  "dimension": "e2e",
  "status": "PASS",
  "step_name": "Playwright E2E",
  "test_command": "npm run test:e2e",
  "browser": "chromium",
  "base_url": "http://localhost:3000",
  "server_command": "npm run start",
  "external_services": "no_production_secrets; mocked_or_not_required",
  "caveats": []
}
```

## Part 4 - Production Smoke Manifest

Target file for future implementation:

```text
.github/workflows/production-smoke.yml
```

Artifact file:

```text
pl20-evidence/production-smoke.json
```

Required commit binding:

- `expected_commit` comes from `Resolve deployment commit`.
- `deployed_commit` must be observed by `validate-production.ps1 -ExpectedCommit`.
- `expected_commit` and `deployed_commit` must match.
- The workflow run must be completed and successful.

Manifest shape:

```json
{
  "schema_version": "pl20-ci-evidence-v1",
  "repository": "risejoaquin/stable-ecomerce",
  "workflow_name": "Selfcare Production Smoke",
  "workflow_run_id": 123456789,
  "workflow_attempt": 1,
  "event": "deployment_status",
  "expected_commit": "FULL_EXPECTED_COMMIT_SHA",
  "deployed_commit": "FULL_DEPLOYED_COMMIT_SHA",
  "target_url": "https://selfcaresinners.com",
  "conclusion": "success",
  "validation_result": "PASS",
  "measured_at": "ISO_TIMESTAMP",
  "race_handling": {
    "requires_final_successful_exact_commit_run": true,
    "skipped_is_pass": false,
    "prior_failed_or_skipped_runs": []
  }
}
```

Known race policy:

- Earlier failed/skipped deployment-status runs may be retained as historical evidence.
- Only the latest completed successful exact-commit validation is current `PASS`.
- Skipped/no-run/missing workflow is never `PASS`.
- Manual `workflow_dispatch` can be accepted only if ChatGPT Web approves it and expected commit matches deployed commit.

## Part 5 - Artifact Upload

Use `actions/upload-artifact@v4`.

Quality Gate artifact:

```yaml
      - name: Upload PL20 Quality Gate Evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pl20-evidence-quality-gate-${{ github.run_id }}-${{ github.run_attempt }}
          path: pl20-evidence/
          retention-days: 30
```

E2E artifact if implemented as separate job:

```yaml
      - name: Upload PL20 E2E Evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pl20-evidence-e2e-${{ github.run_id }}-${{ github.run_attempt }}
          path: pl20-evidence/e2e.json
          retention-days: 30
```

Production smoke artifact:

```yaml
      - name: Upload PL20 Production Smoke Evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pl20-evidence-production-smoke-${{ github.run_id }}-${{ github.run_attempt }}
          path: pl20-evidence/production-smoke.json
          retention-days: 30
```

Trust rule:

- Do not rely on artifact contents alone.
- Importer must independently verify GitHub run, jobs, steps, attempt, SHA, and conclusions.

## Part 6 - Trusted Importer Algorithm

Future importer exact algorithm:

1. Fetch GitHub run by `workflow_run_id`.
2. Fetch jobs for that run.
3. Fetch steps for the relevant jobs.
4. Fetch artifact by run ID and artifact name.
5. Verify repository equals `risejoaquin/stable-ecomerce`.
6. Verify workflow name equals expected workflow.
7. Verify manifest `workflow_run_id` equals fetched run ID.
8. Verify manifest `workflow_attempt` equals fetched run attempt.
9. Verify manifest SHA:
   - Quality Gate/E2E: `manifest.head_sha == run.head_sha`.
   - Production Smoke: `manifest.expected_commit == deployment/manual expected commit` and `manifest.expected_commit == manifest.deployed_commit`.
10. Verify run conclusion.
11. Verify job conclusions.
12. Verify step conclusions match manifest dimensions.
13. Verify manifest schema version.
14. Verify artifact name contains run ID and run attempt.
15. Reject if run/workflow/repo/SHA/attempt/conclusion mismatches.
16. Persist idempotently.

Idempotency key:

```text
dimension + workflow_run_id + workflow_attempt + validated_commit_sha
```

Only after all checks:

```json
{
  "origin": "persisted_trusted_import",
  "classification": "VERIFIED_CI_EVIDENCE"
}
```

## Part 7 - JSONB Storage Shape

Use existing PL20 JSONB provisionally unless a hard blocker is found.

No migration now.

Recommended representation in existing `evidence` JSONB:

```json
{
  "trusted_ci": {
    "classification": "VERIFIED_CI_EVIDENCE",
    "origin": "persisted_trusted_import",
    "dimension": "technical.build.status",
    "status": "PASS",
    "validated_commit_sha": "FULL_COMMIT_SHA",
    "workflow_name": "Selfcare Quality Gate",
    "workflow_run_id": 123456789,
    "workflow_attempt": 1,
    "event": "push",
    "conclusion": "success",
    "evidence_reference": "https://github.com/risejoaquin/stable-ecomerce/actions/runs/123456789",
    "artifact_name": "pl20-evidence-quality-gate-123456789-1",
    "manifest_path": "pl20-evidence/quality-gate.json",
    "imported_at": "ISO_TIMESTAMP",
    "provenance_version": "pl20-ci-evidence-v1"
  }
}
```

Recommended representation in existing `metadata` JSONB:

```json
{
  "source": "github_actions_artifact_import",
  "source_type": "github_actions_verified",
  "measured_state": "MEASURED",
  "calculation_version": "pl20-ci-evidence-v1",
  "trusted_import": true,
  "origin": "persisted_trusted_import",
  "classification": "VERIFIED_CI_EVIDENCE",
  "idempotency_key": "technical.build.status:123456789:1:FULL_COMMIT_SHA",
  "repository": "risejoaquin/stable-ecomerce",
  "workflow_run_id": 123456789,
  "workflow_attempt": 1,
  "validated_commit_sha": "FULL_COMMIT_SHA"
}
```

Storage caveats:

- JSONB is acceptable for provisional PL20 ingestion.
- Dedicated table remains recommended later for uniqueness and queryability.
- Do not allow runtime/admin code to write `VERIFIED_CI_EVIDENCE` without importer verification.

## Part 8 - Security Evidence Mapping

Existing CI security-related steps:

| Workflow Step | Security Dimension | What It Proves | Limit |
|---|---|---|---|
| `Secret scan` | committed secret exposure | Repo scan found no committed secrets when step passes | Does not prove application security blockers are zero. |
| `Security baseline report` | baseline security scan/report execution | Security report script ran and did not fail | Report PASS may mean scanner executed; must inspect findings/scope. |
| `Core regression contracts` | regression/security contract invariants | Core protected behavior stayed intact | Does not replace security audit. |

Can these establish `security_blockers.open_count = 0`?

Not alone.

They can contribute to security evidence, but `security_blockers.open_count = 0` still requires an explicit reviewed security manifest or current known-issues/security assessment that covers blocker scope.

Required additional security evidence for zero blockers:

- current known-issues review;
- explicit critical/open blocker count;
- scope statement;
- reviewer/source;
- commit or evidence timestamp;
- no contradictory active security evidence.

If the reviewed security manifest is missing:

```text
security_blockers.open_count = NOT_MEASURED
```

or remains non-zero/unknown depending on current known issues.

## Implementation Order

1. Add stable step IDs to Quality Gate workflow.
2. Add E2E job or step with no production secrets.
3. Add manifest generation for Quality Gate dimensions.
4. Add manifest generation for E2E.
5. Upload Quality Gate/E2E artifact with run ID and attempt in name.
6. Add production smoke manifest generation after validation.
7. Upload production smoke artifact.
8. Implement importer outside runtime/admin assertion path.
9. Persist verified records into existing JSONB.
10. Validate importer rejects spoofed/stale/mismatched artifacts.
11. Only then allow PL20 technical evidence to use imported trusted CI status.

## Acceptance Criteria

Implementation may be accepted when:

- E2E actually executes before `e2e = PASS`.
- No production secrets are used by E2E CI.
- Quality Gate artifact includes `quality-gate.json`.
- E2E evidence includes `e2e.json`.
- Production Smoke artifact includes `production-smoke.json`.
- Artifact names contain `run_id` and `run_attempt`.
- Retention is at least 30 days.
- Manifest statuses derive from actual GitHub job/step conclusions.
- Importer verifies repo/workflow/run/attempt/SHA/conclusions/manifest before persistence.
- Imported evidence stores `origin = persisted_trusted_import`.
- Imported evidence stores `classification = VERIFIED_CI_EVIDENCE`.
- JSONB storage includes idempotency key and evidence reference.
- Skipped/no-run/stale production smoke never maps to `PASS`.
- Secret scan/security baseline/core regression are not overclaimed as `security_blockers.open_count = 0` without explicit reviewed security manifest.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- workflow delta;
- E2E design;
- manifest generation;
- artifact upload;
- trusted importer algorithm;
- JSONB storage shape;
- security evidence mapping;
- implementation order;
- acceptance criteria.
