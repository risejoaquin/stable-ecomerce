$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "src\main.tsx"
if (!(Test-Path $path)) { Fail "main.tsx exists" }
Pass "main.tsx exists"

$source = Get-Content -Raw -LiteralPath $path

if ($source.Contains("import * as Sentry from '@sentry/react'")) {
  Fail "eager Sentry import removed"
} else {
  Pass "eager Sentry import removed"
}

foreach ($check in @(
  @("await import('@sentry/react')", "dynamic Sentry import configured"),
  @("VITE_SENTRY_DSN", "Sentry DSN guard retained"),
  @("requestIdleCallback", "idle scheduling retained"),
  @("timeout: 2500", "idle timeout retained"),
  @("setTimeout(run, 1500)", "timeout fallback retained"),
  @("window.addEventListener('load'", "post-load scheduling retained"),
  @("tracesSampleRate: 1.0", "tracing sample rate retained"),
  @("replaysSessionSampleRate: 0.1", "replay session rate retained"),
  @("replaysOnErrorSampleRate: 1.0", "replay on error rate retained"),
  @("serviceWorker.register('/sw.js')", "service worker registration retained")
)) {
  if ($source.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

Pass "POST-UX C ITERATION 12 HOTFIX 05 deferred observability regression checks"
