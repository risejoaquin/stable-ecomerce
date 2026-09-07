$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "src\main.tsx"
if (!(Test-Path $path)) { throw "Missing $path" }

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

if (
  $content.Contains("await import('@sentry/react')") -and
  -not $content.Contains("import * as Sentry from '@sentry/react'")
) {
  Write-Host "SKIP deferred Sentry bootstrap already present" -ForegroundColor Yellow
  Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 05 applied" -ForegroundColor Green
  exit 0
}

$oldImport = "import * as Sentry from '@sentry/react';"
if (-not $content.Contains($oldImport)) {
  throw "Expected eager Sentry import not found in src/main.tsx"
}

$content = $content.Replace($oldImport + "`r`n", "")
$content = $content.Replace($oldImport + "`n", "")

$oldInit = @'
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

'@

if (-not $content.Contains($oldInit)) {
  throw "Expected eager Sentry.init block not found in src/main.tsx"
}

$newInit = @'
const sentryDsn = import.meta.env.VITE_SENTRY_DSN || '';

if (sentryDsn) {
  const initializeSentry = async () => {
    const Sentry = await import('@sentry/react');

    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  };

  const scheduleSentryInitialization = () => {
    const run = () => {
      void initializeSentry().catch(() => {
        // Observability must never block storefront rendering.
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 1500);
    }
  };

  if (document.readyState === 'complete') {
    scheduleSentryInitialization();
  } else {
    window.addEventListener('load', scheduleSentryInitialization, { once: true });
  }
}

'@

$content = $content.Replace($oldInit, $newInit)
[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

Write-Host "PATCH restored deferred Sentry bootstrap after load/idle" -ForegroundColor Green
Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 05 applied" -ForegroundColor Green
