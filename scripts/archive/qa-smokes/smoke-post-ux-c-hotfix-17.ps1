$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$app = Get-Content '.\src\App.tsx' -Raw
$seo = Get-Content '.\src\components\SEO.tsx' -Raw
$pkg = Get-Content '.\package.json' -Raw

if (-not $app.Contains('HelmetProvider') -and -not $app.Contains('react-helmet-async')) {
  Pass 'global HelmetProvider removed from App critical path'
} else {
  Fail 'global HelmetProvider removed from App critical path'
}

if (-not $seo.Contains('react-helmet-async') -and -not $seo.Contains('<Helmet')) {
  Pass 'SEO component no longer imports/renders Helmet'
} else {
  Fail 'SEO component no longer imports/renders Helmet'
}

foreach ($needle in @(
  "import React, { useEffect } from 'react';",
  "const SEO_MARKER = 'data-selfcare-seo';",
  'document.title = finalTitle;',
  'meta[name="description"]',
  'meta[name="robots"]',
  'link[rel="canonical"]',
  'meta[property="og:title"]',
  'meta[name="twitter:title"]',
  'script[type="application/ld+json"]',
  'return null;'
)) {
  if ($seo.Contains($needle)) { Pass "native SEO contract: $needle" } else { Fail "native SEO contract: $needle" }
}

if ($pkg.Contains('"react-helmet-async"')) {
  Pass 'dependency remains declared; no package installation/removal required in this hotfix'
} else {
  Fail 'dependency declaration unexpectedly changed'
}

& ".\scripts\qa\smoke-post-ux-c-hotfix-16-3.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 16.3 regression' }
Pass 'HOTFIX 16.3 regression'

Pass 'POST-UX C HOTFIX 17 native SEO head management checks'
