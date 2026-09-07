$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$mainPath = "src\main.tsx"
if (!(Test-Path $mainPath)) { Fail "main source exists" }
Pass "main source exists"

$source = [System.IO.File]::ReadAllText(
  (Resolve-Path $mainPath).Path,
  [System.Text.Encoding]::UTF8
)

if ($source.Contains("import * as Sentry from '@sentry/react';")) {
  Fail "eager Sentry import remains"
} else {
  Pass "eager Sentry import removed"
}

foreach ($check in @(
  @("import('@sentry/react')", "dynamic Sentry import configured"),
  @("VITE_SENTRY_DSN", "Sentry DSN guard retained"),
  @("if (!dsn) return;", "Sentry skipped when DSN absent"),
  @("requestIdleCallback", "idle observability scheduling configured"),
  @("timeout: 2500", "idle timeout fallback bounded"),
  @("setTimeout", "non-idle browser fallback configured"),
  @("browserTracingIntegration", "Sentry tracing retained"),
  @("replayIntegration", "Sentry replay retained"),
  @("tracesSampleRate: 1.0", "Sentry trace sampling retained"),
  @("replaysSessionSampleRate: 0.1", "Sentry replay sampling retained"),
  @("replaysOnErrorSampleRate: 1.0", "Sentry error replay retained"),
  @("createRoot", "React root startup retained"),
  @("serviceWorker.register('/sw.js')", "service worker registration retained")
)) {
  if ($source.Contains($check[0])) {
    Pass $check[1]
  } else {
    Fail $check[1]
  }
}

foreach ($codePoint in @(0x00C3, 0x00C2, 0x00E2)) {
  $marker = [string][char]$codePoint
  if ($source.Contains($marker)) {
    Fail ("possible mojibake marker U+{0:X4} found in main.tsx" -f $codePoint)
  }
}
Pass "main UTF-8 integrity retained"

Pass "POST-UX C Iteration 06 - deferred observability bootstrap checks"
