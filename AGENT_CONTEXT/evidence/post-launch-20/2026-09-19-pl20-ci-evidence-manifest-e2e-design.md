# POST-LAUNCH 20 - CI Evidence Manifest + E2E Workflow Design

Date: 2026-09-19
Mode: READ-ONLY / DESIGN
Current main provided by ChatGPT Web: `e3d8b560e67df4cb5f7da82fe8c595747a1ad747`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This document designs the concrete trusted GitHub Actions evidence manifests and the minimal workflow changes needed so PL20 can eventually ingest real CI evidence.

No workflow YAML, application code, tests, Supabase schema, production data, current-task, handoff, or validation files were modified.

## Current CI Inventory

Current workflow files:

- `.github/workflows/quality-gate.yml`
- `.github/workflows/production-smoke.yml`

Current Quality Gate steps:

- `TypeScript` -> `npm run lint`
- `Unit tests` -> `npm test`
- `Build` -> `npm run build`
- `Secret scan` -> `.\scripts\qa\security\scan-local-secrets.ps1`
- `Core regression contracts` -> `.\scripts\qa\regression\validate-regression-core.ps1`
- `Security baseline report` -> `.\scripts\qa\security\validate-security-baseline.ps1 -Mode Report`

Current Production Smoke steps:

- `Resolve deployment commit`
- `Checkout deployed commit`
- `Validate production` -> `.\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "<resolved commit>"`

Current CI gap:

- Playwright E2E exists locally through `npm run test:e2e`, but it is not run by the current Quality Gate workflow.
- No current workflow uploads PL20 evidence artifacts.

## Part 1 - Quality Gate Manifest

One immutable JSON manifest should be produced per Quality Gate run.

Recommended path inside artifact:

```text
pl20-evidence/quality-gate.json
```

Recommended schema:

```json
{
  "schema_version": "pl20-ci-evidence-v1",
  "repository": "risejoaquin/stable-ecomerce",
  "workflow_name": "Selfcare Quality Gate",
  "workflow_run_id": 123456789,
  "workflow_attempt": 1,
  "event": "push",
  "head_sha": "FULL_COMMIT_SHA",
  "started_at": "2026-09-19T00:00:00Z",
  "completed_at": "2026-09-19T00:10:00Z",
  "conclusion": "success",
  "dimensions": {
    "release_gate": {
      "status": "PASS",
      "step_name": "Selfcare Quality Gate / quality",
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
    }
  }
}
```

Rules:

- `status` may be only `PASS`, `FAIL`, `STALE`, or `NOT_MEASURED`.
- No numeric scores.
- `release_gate.status = PASS` only if the whole workflow/job conclusion is `success`.
- Dimension `PASS` requires the corresponding step conclusion to be `success`.
- Missing step evidence maps to `NOT_MEASURED`.
- Skipped/cancelled/timed-out/action-required maps to `FAIL` or `NOT_MEASURED`, never `PASS`.
- `head_sha` must match GitHub run metadata during import.

## Part 2 - E2E Gap

Current E2E configuration:

- Config file: `playwright.config.ts`
- Test directory: `./e2e`
- Browser project: Chromium only
- Base URL: `http://localhost:3000`
- Web server command: `npm run start`
- CI behavior: retries enabled, one worker
- Test script: `npm run test:e2e`

Current E2E tests:

- `e2e/home.spec.ts`
- `e2e/mobile-ux-f.spec.ts`
- `e2e/qa-release-e-functional-quality.spec.ts`

### Minimal Safe CI Approach

Minimal workflow additions, design only:

1. Keep existing `npm ci`.
2. Keep existing `npm run build`.
3. Install Playwright Chromium browser after dependencies:

```powershell
npx playwright install chromium
```

4. Run:

```powershell
npm run test:e2e
```

5. Generate/upload `pl20-evidence/e2e.json`.

### Dependencies Required

Already present in `devDependencies`:

- `@playwright/test`
- `@axe-core/playwright`

Browser install required in CI:

- Chromium via `npx playwright install chromium`

On `windows-latest`, system dependencies are usually available. If moving to Linux later, `npx playwright install --with-deps chromium` may be needed.

### Required Environment

E2E server starts via:

```text
npm run start
```

That requires a prior successful:

```text
npm run build
```

The current E2E suite largely mocks frontend API calls through `page.route`. Based on inspected tests:

- checkout API is mocked and returns controlled 400;
- login API is mocked;
- product/store/cart/profile/admin API calls are mocked;
- no live Stripe checkout session should be created;
- no live email should be sent;
- no production Supabase mutation should occur.

Risk to verify before enabling CI:

- `npm run start` must boot deterministically without production secrets.
- The server should tolerate missing Supabase/Stripe/Resend environment variables for local E2E.
- Any non-mocked page/API call should remain non-mutating or be mocked before use.

### External Services

Expected current requirement: no external services for E2E assertions, provided the app can start without live env vars and Playwright route mocks cover all critical API calls.

Must not be used by CI E2E:

- Stripe live keys.
- Resend live keys.
- Supabase production service role.
- Production database URL.

### Expected Runtime Impact

Expected added runtime:

- Playwright browser install: moderate one-time CI overhead, reducible by cache.
- E2E run: current suite is Chromium-only with one worker in CI and should be moderate.
- Existing Quality Gate timeout is 20 minutes; adding E2E may require increasing timeout after measurement.

Do not invent a final timeout. Measure first CI run and adjust only with evidence.

### Caching Opportunities

- `actions/setup-node` already caches npm.
- Playwright browser cache can be cached by OS and Playwright version if ChatGPT Web approves.
- Cache key should include OS and package lock hash or Playwright package version.

### E2E Manifest

Recommended path:

```text
pl20-evidence/e2e.json
```

Recommended schema:

```json
{
  "schema_version": "pl20-ci-evidence-v1",
  "repository": "risejoaquin/stable-ecomerce",
  "workflow_name": "Selfcare Quality Gate",
  "workflow_run_id": 123456789,
  "workflow_attempt": 1,
  "event": "push",
  "head_sha": "FULL_COMMIT_SHA",
  "started_at": "2026-09-19T00:00:00Z",
  "completed_at": "2026-09-19T00:12:00Z",
  "conclusion": "success",
  "dimension": "e2e",
  "status": "PASS",
  "step_name": "Playwright E2E",
  "test_command": "npm run test:e2e",
  "browser": "chromium",
  "base_url": "http://localhost:3000",
  "server_command": "npm run start",
  "external_services": "mocked_or_not_required",
  "caveats": []
}
```

## Part 3 - Production Smoke Manifest

Recommended path:

```text
pl20-evidence/production-smoke.json
```

Recommended schema:

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
  "measured_at": "2026-09-19T00:20:00Z",
  "race_handling": {
    "requires_final_successful_exact_commit_run": true,
    "skipped_is_pass": false,
    "prior_failed_or_skipped_runs": []
  }
}
```

Production smoke rules:

- `validation_result = PASS` only when `conclusion = success`.
- `expected_commit` must equal the commit passed to `validate-production.ps1 -ExpectedCommit`.
- `deployed_commit` must equal the production app reported commit/version.
- `expected_commit` must equal `deployed_commit`.
- A skipped workflow, skipped job, no-run, missing run, or stale run is never `PASS`.
- Earlier race failures/skips must be recorded as historical context, not current pass/fail override.
- If multiple runs exist for a deployment commit, import the latest completed successful exact-commit run and preserve references to earlier failed/skipped race runs.

## Part 4 - Artifact Strategy

Recommended artifact layout:

```text
pl20-evidence/
  quality-gate.json
  e2e.json
  production-smoke.json
```

Recommended artifact names:

- Quality Gate: `pl20-evidence-quality-gate-${{ github.run_id }}-${{ github.run_attempt }}`
- Production Smoke: `pl20-evidence-production-smoke-${{ github.run_id }}-${{ github.run_attempt }}`

Retention:

- Use a retention period long enough for PL20 review and audit. Suggested minimum: 30 days.
- Longer retention may be required if GitHub artifacts become the primary audit source.

Immutability limitations:

- GitHub artifacts are tied to a workflow run, but retention expires.
- A rerun creates a new attempt and may upload a new artifact.
- Artifact contents must be verified against GitHub run metadata during import.
- Do not trust artifact JSON alone.

Download/import verification:

- Fetch artifact by GitHub run ID and artifact name.
- Verify artifact belongs to expected repository and workflow run.
- Verify `workflow_run_id` and `workflow_attempt` inside JSON match GitHub metadata.
- Verify `head_sha` / expected commit matches GitHub metadata.
- Verify workflow conclusion and step/job conclusions independently.
- Verify manifest dimensions are consistent with actual step names.

Run ID correlation:

- Manifest `workflow_run_id` must equal GitHub run ID.
- Manifest `workflow_attempt` must equal GitHub run attempt.
- Manifest `head_sha` must equal GitHub run `head_sha`, except production smoke where `expected_commit` may come from deployment payload/manual input and must be independently validated.

## Part 5 - Trusted Import Algorithm

Future operator/agent import flow:

1. Fetch artifact by GitHub run ID.
2. Independently fetch GitHub run metadata.
3. Verify repository is `risejoaquin/stable-ecomerce`.
4. Verify workflow name matches the expected workflow.
5. Verify workflow attempt matches the manifest.
6. Verify SHA:
   - Quality Gate/E2E: manifest `head_sha` equals run `head_sha`.
   - Production Smoke: manifest `expected_commit` equals resolved deployment/manual expected commit and app `deployed_commit`.
7. Verify workflow conclusion.
8. Verify job and step conclusions where available.
9. Verify manifest content and schema version.
10. Persist evidence idempotently.

Idempotency key:

```text
dimension + workflow_run_id + workflow_attempt + validated_commit_sha
```

Dimension mapping:

- `release_gate`
- `build`
- `unit_tests`
- `secret_scan`
- `core_regression`
- `security_baseline`
- `e2e`
- `production_smoke`

Import status mapping:

- GitHub conclusion `success` plus matching step/dimension evidence -> `PASS`.
- Failure-like conclusion -> `FAIL`.
- SHA/attempt/workflow mismatch -> `STALE` or reject import.
- Missing artifact or missing dimension -> `NOT_MEASURED`.

Replay/spoof controls:

- Never persist a manifest without independently checking GitHub metadata.
- Never accept manually edited local JSON as trusted evidence.
- Never accept a run from another repo/workflow.
- Never let an old run satisfy a newer commit.
- Never let a production smoke run pass unless it validates the exact deployed commit.

## Part 6 - Storage Options

| Option | Strengths | Weaknesses | Schema Change Required? |
|---|---|---|---|
| Existing JSONB rows | Fastest path; can store full manifest/provenance in existing PL20 metadata/evidence fields | Harder to enforce uniqueness, query dimensions, or prevent malformed evidence | Not required for provisional ingestion |
| Dedicated PL20 evidence table | Strong idempotency, queryability, uniqueness constraints, dimension indexing, audit clarity | Requires migration/design approval | Recommended for durable implementation |
| Repository evidence manifest | Reviewable in Git history; easy for human audit | Can lag behind CI, may be manually edited, weak runtime query source | No DB schema change, but not sufficient alone for runtime PL20 |

Recommendation:

- Schema change is not strictly required for a provisional PL20 handoff if existing JSONB can store the full manifest and import metadata.
- A dedicated PL20 evidence table is recommended before treating CI ingestion as durable production infrastructure.
- Do not create a migration until ChatGPT Web approves storage ownership, retention, uniqueness, and import authority.

## Implementation Prerequisites

Before implementation, ChatGPT Web must approve:

- whether E2E belongs in `Selfcare Quality Gate` or a separate workflow;
- exact workflow step names for manifest dimensions;
- artifact retention days;
- whether Playwright browser caching should be added;
- whether Quality Gate timeout must increase after measured runtime;
- manifest generation method;
- GitHub API permissions for importer;
- final storage target;
- idempotency conflict behavior;
- production smoke race recording format;
- policy for missing E2E evidence before the workflow change lands.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- manifest schemas;
- E2E CI design;
- production-smoke manifest;
- artifact strategy;
- trusted import algorithm;
- idempotency model;
- storage options;
- implementation prerequisites.
