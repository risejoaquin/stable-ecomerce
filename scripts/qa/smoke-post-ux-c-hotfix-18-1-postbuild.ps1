$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$vendor = Get-ChildItem '.\dist\assets\vendor-*.js' |
  Where-Object { $_.Name -notmatch 'vendor-(ui|query|charts|commerce|observability)' } |
  Sort-Object Length -Descending |
  Select-Object -First 1

if (-not $vendor) { Fail 'core vendor chunk exists after rollback build' }

$js = Get-Content $vendor.FullName -Raw
$lucideCount = ([regex]::Matches($js, '@license lucide-react')).Count

Write-Host "CORE_VENDOR=$($vendor.Name)"
Write-Host "CORE_VENDOR_BYTES=$($vendor.Length)"
Write-Host "CORE_VENDOR_LUCIDE_LICENSES=$lucideCount"

foreach ($needle in @(
  'react.production.js',
  'scheduler.production.js',
  'react-dom.production.js',
  'react-router v'
)) {
  if ($js.Contains($needle)) { Pass "stable core retained: $needle" } else { Fail "stable core retained: $needle" }
}

if ($lucideCount -gt 0) {
  Pass "lucide modules restored to stable core vendor: $lucideCount"
} else {
  Fail 'lucide modules restored to stable core vendor'
}

Pass 'POST-UX C HOTFIX 18.1 post-build stable vendor checks'
