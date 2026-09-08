$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$core = Get-ChildItem '.\dist\assets\vendor-*.js' |
  Where-Object { $_.Name -notmatch 'vendor-(ui|query|charts|commerce|observability|toast)' } |
  Sort-Object Length -Descending |
  Select-Object -First 1

$toast = Get-ChildItem '.\dist\assets\vendor-toast-*.js' |
  Sort-Object Length -Descending |
  Select-Object -First 1

if (-not $core) { Fail 'core vendor exists' }
if (-not $toast) { Fail 'vendor-toast chunk exists' }

$coreJs = Get-Content $core.FullName -Raw
$toastJs = Get-Content $toast.FullName -Raw

Write-Host "CORE_VENDOR=$($core.Name)"
Write-Host "CORE_VENDOR_BYTES=$($core.Length)"
Write-Host "CORE_VENDOR_GOOBER=$($coreJs.Contains('_goober'))"
Write-Host "TOAST_VENDOR=$($toast.Name)"
Write-Host "TOAST_VENDOR_BYTES=$($toast.Length)"
Write-Host "TOAST_VENDOR_GOOBER=$($toastJs.Contains('_goober'))"

foreach ($needle in @(
  'react.production.js',
  'scheduler.production.js',
  'react-dom.production.js',
  'react-router v',
  '@license lucide-react'
)) {
  if ($coreJs.Contains($needle)) { Pass "stable core retained: $needle" } else { Fail "stable core retained: $needle" }
}

if (-not $coreJs.Contains('_goober')) {
  Pass 'goober removed from core vendor'
} else {
  Fail 'goober removed from core vendor'
}

if ($toastJs.Contains('_goober')) {
  Pass 'goober isolated in vendor-toast'
} else {
  Fail 'goober isolated in vendor-toast'
}

Pass 'POST-UX C HOTFIX 19.2 post-build checks'
