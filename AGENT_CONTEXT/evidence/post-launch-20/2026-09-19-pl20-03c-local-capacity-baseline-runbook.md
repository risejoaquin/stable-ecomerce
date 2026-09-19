# POST-LAUNCH 20 - PL20-03C Local Capacity Baseline Runbook

Date: 2026-09-19
Mode: READ-ONLY / DESIGN / NO LOAD TEST EXECUTION
Current main: `70fd3f8a89d05d4c0554f600815efea10d8087c0`
Result: READY_FOR_CHATGPT_WEB_VALIDATION

## Scope

This runbook defines the exact first local-only PL20-03C capacity baseline procedure.

No load test was executed. No application code, tests, workflow YAML, k6 script, Supabase, Railway, production resources, current-task, handoff, or validation files were modified.

This procedure is only for local harness validation and first local baseline evidence. It is not production capacity proof, scale readiness, or CCU certification.

## Part 1 - Local Environment Isolation

The first approved run must prove all of the following before k6 starts:

- `BASE_URL` is localhost or loopback only.
- No production Supabase URL is loaded.
- No production Supabase service role secret is loaded.
- No Stripe live key is loaded.
- No Resend live key is loaded.
- No Railway production target is used.
- k6 target routes remain the approved `SAFE_READ` set.

### Local BASE_URL Check

Approved local `BASE_URL` examples:

```text
http://127.0.0.1:3000
http://localhost:3000
http://[::1]:3000
```

Reject:

```text
https://selfcaresinners.com
https://*.railway.app
any URL containing /checkout, /orders, /admin, /refund, /payment, or /webhook
```

PowerShell preflight:

```powershell
$BaseUrl = 'http://127.0.0.1:3000'
$uri = [uri]$BaseUrl
$allowedHosts = @('localhost', '127.0.0.1', '::1')
if ($allowedHosts -notcontains $uri.Host) { throw "BASE_URL is not localhost/loopback: $($uri.Host)" }
if ($uri.AbsolutePath -ne '/') { throw "BASE_URL must be host/root only: $($uri.AbsolutePath)" }
if ($BaseUrl -match 'selfcaresinners\.com|railway\.app|checkout|orders|admin|refund|payment|webhook') {
  throw 'BASE_URL contains production or mutation indicators.'
}
"BASE_URL local isolation PASS: $BaseUrl"
```

### Secret and Provider Isolation Check

Do not print secret values. Print only variable names and boolean risk flags.

PowerShell preflight:

```powershell
$sensitiveEnv = Get-ChildItem Env: |
  Where-Object { $_.Name -match 'SUPABASE|DATABASE|POSTGRES|STRIPE|RESEND|RAILWAY|VITE_SUPABASE|SERVICE_ROLE' } |
  Select-Object Name,
    @{ Name = 'HasValue'; Expression = { [bool]$_.Value } },
    @{ Name = 'LooksProductionOrLive'; Expression = {
      $_.Value -match 'selfcaresinners|railway\.app|supabase\.co|service_role|sk_live|rk_live|whsec_|re_[A-Za-z0-9]'
    }}

$sensitiveEnv | Format-Table -AutoSize

if ($sensitiveEnv | Where-Object { $_.LooksProductionOrLive }) {
  throw 'Local isolation failed: production/live provider indicator detected in environment.'
}

'Provider secret isolation PASS: no production/live indicators detected by local preflight.'
```

Expected proof:

- command output shows no `LooksProductionOrLive = True`;
- no secret values are printed;
- local app starts with local/test-safe configuration only;
- any required external dependency is mocked, absent, or confirmed non-production.

### Railway Production Target Check

PowerShell preflight:

```powershell
if ($BaseUrl -match 'railway\.app|selfcaresinners\.com') {
  throw 'Railway/production target is forbidden for the local baseline.'
}
'Railway production target isolation PASS.'
```

### SAFE_READ Route Check

Approved routes:

```text
/
/api/health
/api/readiness
/api/public/store
/api/public/home
/api/public/categories
/api/products
```

Forbidden categories:

```text
checkout
orders
admin
refund
payment
webhook
email
newsletter
contact
inventory mutation
analytics mutation
ads mutation
```

## Part 2 - Baseline Values

Recommended smallest safe local baseline values:

| Variable | Value |
|---|---|
| `APPROVED_VUS` | `1` |
| `APPROVED_DURATION` | `30s` |
| `APPROVED_SLEEP_SECONDS` | `1` |
| `PL20_ENVIRONMENT` | `local` |
| `PL20_STAGE` | `LOCAL_BASELINE_01` |

Rationale:

- `1` VU is the minimum valid k6 concurrency and validates script behavior without applying meaningful pressure.
- `30s` is long enough to exercise the route loop repeatedly and capture basic latency/error metrics.
- `1` second sleep reduces local request intensity and makes logs easier to inspect.
- `local` prevents any claim that remote/staging/production capacity was measured.
- `LOCAL_BASELINE_01` names the run as first baseline evidence, not certification.

This baseline is suitable for:

- validating the fail-closed k6 script;
- confirming all approved `SAFE_READ` routes are exercised;
- capturing first local latency/error metrics;
- testing the parser inputs.

This baseline is not suitable for:

- production capacity proof;
- scale readiness;
- concurrent customer capacity;
- Railway capacity;
- Supabase pool/pressure capacity;
- finalScaleReady.

## Part 3 - Commands

These commands are prepared for a future approved local run. They were not executed in this task.

### Check k6

```powershell
k6 version
if ($LASTEXITCODE -ne 0) { throw 'k6 is not installed or not on PATH.' }
```

### Build and Start Local App

Use a local shell/job so the process can be stopped cleanly after the baseline.

```powershell
Set-Location 'C:\Users\Lucilfer\Documents\Stable-Ecommerce'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed; do not run local baseline.' }

$env:PORT = '3000'
$serverJob = Start-Job -Name 'pl20-local-app' -ScriptBlock {
  Set-Location 'C:\Users\Lucilfer\Documents\Stable-Ecommerce'
  $env:PORT = '3000'
  npm run start
}

Start-Sleep -Seconds 5
Receive-Job -Job $serverJob -Keep
```

### Validate Local Isolation

```powershell
$BaseUrl = 'http://127.0.0.1:3000'
$uri = [uri]$BaseUrl
$allowedHosts = @('localhost', '127.0.0.1', '::1')
if ($allowedHosts -notcontains $uri.Host) { throw "BASE_URL is not localhost/loopback: $($uri.Host)" }
if ($uri.AbsolutePath -ne '/') { throw "BASE_URL must be host/root only: $($uri.AbsolutePath)" }
if ($BaseUrl -match 'selfcaresinners\.com|railway\.app|checkout|orders|admin|refund|payment|webhook') {
  throw 'BASE_URL contains production or mutation indicators.'
}

$sensitiveEnv = Get-ChildItem Env: |
  Where-Object { $_.Name -match 'SUPABASE|DATABASE|POSTGRES|STRIPE|RESEND|RAILWAY|VITE_SUPABASE|SERVICE_ROLE' } |
  Select-Object Name,
    @{ Name = 'HasValue'; Expression = { [bool]$_.Value } },
    @{ Name = 'LooksProductionOrLive'; Expression = {
      $_.Value -match 'selfcaresinners|railway\.app|supabase\.co|service_role|sk_live|rk_live|whsec_|re_[A-Za-z0-9]'
    }}

$sensitiveEnv | Format-Table -AutoSize
if ($sensitiveEnv | Where-Object { $_.LooksProductionOrLive }) {
  throw 'Local isolation failed: production/live provider indicator detected in environment.'
}
```

### Validate SAFE_READ Endpoints Before k6

```powershell
$BaseUrl = 'http://127.0.0.1:3000'
$routes = @(
  '/',
  '/api/health',
  '/api/readiness',
  '/api/public/store',
  '/api/public/home',
  '/api/public/categories',
  '/api/products'
)

foreach ($route in $routes) {
  $url = "$BaseUrl$route"
  $response = Invoke-WebRequest -Uri $url -Method GET -MaximumRedirection 0 -SkipHttpErrorCheck
  [pscustomobject]@{
    Route = $route
    StatusCode = [int]$response.StatusCode
    ContentLength = $response.RawContentLength
  }
}
```

Review before continuing:

- every request used `GET`;
- no route is outside `SAFE_READ`;
- no route redirects to checkout/admin/orders/payment/refund;
- no server log shows mutation, email, payment, order, inventory, webhook, or admin side effect.

### Run Local k6 Baseline

This is the first command that actually runs k6. It requires explicit future approval before execution.

```powershell
Set-Location 'C:\Users\Lucilfer\Documents\Stable-Ecommerce'

$env:BASE_URL = 'http://127.0.0.1:3000'
$env:PL20_ENVIRONMENT = 'local'
$env:PL20_STAGE = 'LOCAL_BASELINE_01'
$env:APPROVED_VUS = '1'
$env:APPROVED_DURATION = '30s'
$env:APPROVED_SLEEP_SECONDS = '1'
$env:K6_SUMMARY_PATH = 'AGENT_CONTEXT/evidence/post-launch-20/pl20-03c-local-baseline-summary.json'

k6 run .\scripts\load\pl20-baseline.k6.js
if ($LASTEXITCODE -ne 0) { throw 'k6 local baseline failed.' }
```

### Capture Summary

```powershell
$summaryPath = 'AGENT_CONTEXT/evidence/post-launch-20/pl20-03c-local-baseline-summary.json'
if (-not (Test-Path -LiteralPath $summaryPath)) { throw "Missing k6 summary: $summaryPath" }

$summary = Get-Content -LiteralPath $summaryPath -Raw | ConvertFrom-Json

[pscustomobject]@{
  requests_total = $summary.metrics.http_reqs.values.count
  requests_per_second = $summary.metrics.http_reqs.values.rate
  error_rate = $summary.metrics.http_req_failed.values.rate
  p50_latency_ms = $summary.metrics.http_req_duration.values.med
  p95_latency_ms = $summary.metrics.http_req_duration.values.'p(95)'
  p99_latency_ms = $summary.metrics.http_req_duration.values.'p(99)'
  max_latency_ms = $summary.metrics.http_req_duration.values.max
  http_5xx_count = $summary.metrics.http_5xx_count.values.count
} | Format-List
```

### Inspect Logs

```powershell
Receive-Job -Name 'pl20-local-app' -Keep
```

Review logs for:

- route errors;
- 5xx responses;
- database connection errors;
- provider calls;
- emails;
- Stripe calls;
- order/inventory/admin mutation traces.

### Stop Local App

```powershell
Stop-Job -Name 'pl20-local-app'
Receive-Job -Name 'pl20-local-app' -Keep
Remove-Job -Name 'pl20-local-app'
Remove-Item Env:\BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\PL20_ENVIRONMENT -ErrorAction SilentlyContinue
Remove-Item Env:\PL20_STAGE -ErrorAction SilentlyContinue
Remove-Item Env:\APPROVED_VUS -ErrorAction SilentlyContinue
Remove-Item Env:\APPROVED_DURATION -ErrorAction SilentlyContinue
Remove-Item Env:\APPROVED_SLEEP_SECONDS -ErrorAction SilentlyContinue
Remove-Item Env:\K6_SUMMARY_PATH -ErrorAction SilentlyContinue
```

## Part 4 - Result Parser Checklist

ChatGPT Web should review the raw k6 summary and extracted fields.

| Field | Expected Source | Review Rule |
|---|---|---|
| `requests_total` | `metrics.http_reqs.values.count` | Must be present and greater than zero for a valid local baseline. |
| `requests_per_second` | `metrics.http_reqs.values.rate` | Informational only until SLOs are approved. |
| `error_rate` | `metrics.http_req_failed.values.rate` | Must be inspected; no SLO threshold is approved yet. |
| `p50_latency_ms` | `metrics.http_req_duration.values.med` | Informational local latency baseline. |
| `p95_latency_ms` | `metrics.http_req_duration.values["p(95)"]` | Informational local latency baseline. |
| `p99_latency_ms` | `metrics.http_req_duration.values["p(99)"]` | Informational local latency baseline. |
| `max_latency_ms` | `metrics.http_req_duration.values.max` | Inspect for extreme local outliers. |
| `http_5xx_count` | `metrics.http_5xx_count.values.count` | Must be present. Any nonzero value requires log review before acceptance. |

No pass/fail SLO exists yet.

Parser acceptance requires:

- raw summary preserved;
- k6 version captured separately;
- approved environment variables recorded;
- route list recorded or derivable from script version;
- local isolation proof attached;
- app logs inspected;
- no mutation route or side-effect route observed.

## Part 5 - Baseline Acceptance

Local baseline `PASS` means only:

- k6 script executed correctly;
- all `SAFE_READ` routes were exercised;
- no mutation routes were exercised;
- no systemic 5xx failure was observed;
- metrics were captured;
- local app logs were inspected;
- environment isolation was proven;
- no production/Railway/Supabase/Stripe/Resend live target was used.

Local baseline `PASS` must not mean:

- production capacity proven;
- staging capacity proven;
- scale ready;
- CCU capacity certified;
- Supabase pool capacity proven;
- Railway CPU/memory/restart behavior proven;
- finalScaleReady;
- PL20 capacity closure.

The correct PL20 interpretation after only this local baseline is:

```text
capacity.local_baseline = MEASURED
capacity.scale_capacity = NOT_MEASURED_AT_SCALE
finalScaleReady = false
```

## Part 6 - Next Stage Gate

### Evidence Required Before Staging Baseline

Before allowing a staging baseline, ChatGPT Web/user must approve:

- target environment URL;
- proof it is not production;
- staging app/data isolation;
- no production Supabase service role;
- no Stripe live keys;
- no Resend live keys;
- no real checkout/payment/email/order side effects;
- approved `SAFE_READ` route list;
- approved VUs, duration, and sleep;
- stop conditions;
- monitoring plan;
- artifact path for k6 summary and logs;
- rollback/stop operator.

Minimum staging evidence:

- local baseline completed and reviewed;
- k6 summary parser validated;
- staging health endpoint confirmed;
- staging logs available;
- provider dashboards/logs read-only access plan if needed;
- no known mutation route in target list.

### Evidence Required Before Production Read-Only Baseline

No production baseline is authorized by this task.

Before production read-only baseline can be considered, ChatGPT Web/user must explicitly approve:

- production target and exact window;
- exact VUs, duration, sleep, and route list;
- proof that only `SAFE_READ` routes are used;
- proof that checkout, payments, refunds, email, orders, inventory, admin, webhooks, analytics mutations, and ads mutations are excluded;
- monitoring owner;
- live stop conditions;
- Railway CPU/memory/restart monitoring;
- Supabase connection pressure/query latency monitoring if database routes are included;
- incident rollback/abort procedure;
- customer-impact risk acceptance;
- evidence storage path;
- post-run production log review.

Production read-only baseline must still not claim scale readiness unless approved thresholds, provider monitoring, and DB pressure evidence are present.

## Stop Conditions

Abort immediately if any of these occur during a future approved run:

- target is not localhost for the local baseline;
- any production/live provider indicator is detected;
- k6 attempts a non-`SAFE_READ` route;
- any request touches checkout, orders, admin, refund, payment, webhook, email, inventory, analytics mutation, or ads mutation path;
- systemic 5xx appears;
- local app crashes;
- logs show provider side effects;
- logs show database mutation side effects;
- metrics summary is missing or malformed.

## Final Output

READY_FOR_CHATGPT_WEB_VALIDATION

Included:

- local environment isolation checks;
- smallest safe local baseline values;
- exact future PowerShell commands;
- result parser checklist;
- local baseline acceptance definition;
- next stage gate for staging and production read-only baseline.
