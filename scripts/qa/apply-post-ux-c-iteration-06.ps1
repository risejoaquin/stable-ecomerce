$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Replace-Utf8Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Marker
  )

  if (!(Test-Path $Path)) {
    throw "Missing file: $Path"
  }

  $full = (Resolve-Path $Path).Path
  $content = [System.IO.File]::ReadAllText(
    $full,
    [System.Text.Encoding]::UTF8
  )

  if ($content.Contains($New)) {
    Write-Host "SKIP already applied: $Marker" -ForegroundColor Yellow
    return
  }

  if (!$content.Contains($Old)) {
    throw "Patch anchor not found for $Marker in $Path"
  }

  $content = $content.Replace($Old, $New)
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

  Write-Host "PATCH $Marker" -ForegroundColor Green
}

$mainPath = "src\main.tsx"

Replace-Utf8Exact `
  -Path $mainPath `
  -Old @'
import { ErrorBoundary } from './components/ErrorBoundary';
import * as Sentry from '@sentry/react';

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
'@ `
  -New @'
import { ErrorBoundary } from './components/ErrorBoundary';

function scheduleObservabilityBootstrap() {
  const dsn = import.meta.env.VITE_SENTRY_DSN || '';
  if (!dsn) return;

  const bootstrap = async () => {
    try {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    } catch {
      // Observability must never block storefront startup.
    }
  };

  const scheduleIdle = () => {
    const browser = window as any;

    if (typeof browser.requestIdleCallback === 'function') {
      browser.requestIdleCallback(
        () => { void bootstrap(); },
        { timeout: 2500 },
      );
      return;
    }

    window.setTimeout(() => { void bootstrap(); }, 1500);
  };

  if (document.readyState === 'complete') {
    scheduleIdle();
  } else {
    window.addEventListener('load', scheduleIdle, { once: true });
  }
}

scheduleObservabilityBootstrap();
'@ `
  -Marker "defer Sentry observability bootstrap"

Write-Host "PASS POST-UX C Iteration 06 patch applied" -ForegroundColor Green
