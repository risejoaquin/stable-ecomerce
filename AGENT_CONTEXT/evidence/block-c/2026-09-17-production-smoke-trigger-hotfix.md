# QA / RELEASE E HOTFIX — Production Smoke Trigger

Date: 2026-09-17
Operator: Codex
Scope: Block C / GitHub Actions production smoke trigger
Status: PASS for requested hotfix; QA / RELEASE E remains open.

## Change

File changed:

- `.github/workflows/production-smoke.yml`

Exact change:

- Removed only the `if:` condition from job `production-smoke`.

Preserved unchanged:

- `workflow_dispatch`
- `deployment_status` states: `[success]`
- `Resolve deployment commit`
- `Checkout deployed commit`
- `validate-production.ps1`
- `BaseUrl`
- `ExpectedCommit` logic

Commit:

- `8e51b3b9b13949ef2e9e10aa18ad21f58541ca51`
- Message: `ci: run production smoke on deployment success`

## Validation

YAML syntax:

```text
npx --yes yaml-lint .github/workflows/production-smoke.yml
√ YAML Lint successful.
```

Diff check:

```text
git diff --check
exit 0
```

Staged files:

```text
.github/workflows/production-smoke.yml
```

Push:

```text
git push origin main
c7bd9e7..8e51b3b  main -> main
```

HEAD / origin:

```text
HEAD:        8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
origin/main: 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
```

## GitHub Actions

Selfcare Quality Gate:

```text
Run: 35283671819
Event: push
Conclusion: success
Job: quality in 1m16s
Commit: 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
```

Selfcare Production Smoke:

First deployment_status run:

```text
Run: 35283677281
Conclusion: failure
Reason: production still returned previous deployed commit
Expected: 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
Received: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
```

Second deployment_status run:

```text
Run: 35283744525
Event: deployment_status
Conclusion: success
Job: production-smoke
Commit: 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
```

Successful production smoke log excerpt:

```text
DEPLOYMENT_SHA: 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
CURRENT_SHA: 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
Checkout ref: 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
PASS route / -> 200
PASS route /faq -> 200
PASS route /privacy -> 200
PASS route /returns -> 200
PASS route /terms -> 200
PASS route /track -> 200
PASS health status -> ok
PASS deployed commit -> 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
PASS admin diagnostics unauthorized boundary -> 401
PASS Content-Security-Policy present
PASS X-Content-Type-Options present
PASS production non-destructive smoke
```

## Railway

```text
Project: heroic-solace
Environment: production
Service: stable-ecomerce
Status: Online
URL: https://selfcaresinners.com
Deployment ID observed after hotfix: fb83a1cb-5023-41aa-8948-a8be23cd2d14
```

## Local Production Confirmation

Command:

```text
.\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "8e51b3b9b13949ef2e9e10aa18ad21f58541ca51"
```

Result:

```text
PASS route / -> 200
PASS route /faq -> 200
PASS route /privacy -> 200
PASS route /returns -> 200
PASS route /terms -> 200
PASS route /track -> 200
PASS health status -> ok
PASS deployed commit -> 8e51b3b9b13949ef2e9e10aa18ad21f58541ca51
PASS admin diagnostics unauthorized boundary -> 401
PASS Content-Security-Policy present
PASS X-Content-Type-Options present
PASS production non-destructive smoke
```

## Final Summary

PASS:

- YAML syntax validated.
- `git diff --check` passed.
- Hotfix committed and pushed.
- Selfcare Quality Gate passed.
- Railway deployed and is Online.
- Selfcare Production Smoke executed from `deployment_status` and did not remain skipped.
- Production smoke passed against deployed commit `8e51b3b9b13949ef2e9e10aa18ad21f58541ca51`.

Not closed:

- QA / RELEASE E remains open.
- No POST-LAUNCH 20 advancement performed.
- Roadmap not closed.
