$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$legacySmoke = 'scripts\qa\smoke-post-ux-c-hotfix-13-1.ps1'
$currentSmoke = 'scripts\qa\smoke-post-ux-c-hotfix-13-2.ps1'
foreach ($file in @($legacySmoke,$currentSmoke,'index.html','public\brand-fonts-loader.js')) {
  if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" }
}

$legacy = Get-Content $legacySmoke -Raw
$html = Get-Content 'index.html' -Raw
if ($legacy.Contains('onload="this.media=')) { Fail 'HOTFIX 13.1 smoke obsolete inline-onload contract removed' } else { Pass 'HOTFIX 13.1 smoke obsolete inline-onload contract removed' }
if ($legacy.Contains('media="print"')) { Pass 'HOTFIX 13.1 smoke still protects non-blocking media=print behavior' } else { Fail 'HOTFIX 13.1 smoke still protects non-blocking media=print behavior' }
if ($legacy.Contains('<noscript><link rel="stylesheet"')) { Pass 'HOTFIX 13.1 smoke still protects noscript font fallback' } else { Fail 'HOTFIX 13.1 smoke still protects noscript font fallback' }
if ($html.Contains('onload="this.media=')) { Fail 'production HTML remains free of CSP-blocked inline font handlers' } else { Pass 'production HTML remains free of CSP-blocked inline font handlers' }
if ($html.Contains('src="/brand-fonts-loader.js" defer')) { Pass 'CSP-safe external brand-font loader retained' } else { Fail 'CSP-safe external brand-font loader retained' }

& $currentSmoke
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 13.2 smoke remains PASS after QA contract repair' }
Pass 'HOTFIX 13.2 smoke remains PASS after QA contract repair'

& $legacySmoke
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 13.1 regression smoke compatible with CSP-safe successor' }
Pass 'HOTFIX 13.1 regression smoke compatible with CSP-safe successor'

Pass 'POST-UX C HOTFIX 13.2.1 inherited QA contract repair checks'
