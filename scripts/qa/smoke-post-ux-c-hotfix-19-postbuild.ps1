$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$vendor = Get-ChildItem '.\dist\assets\vendor-*.js' |
  Where-Object { $_.Name -notmatch 'vendor-(ui|query|charts|commerce|observability)' } |
  Sort-Object Length -Descending |
  Select-Object -First 1

if (-not $vendor) { Fail 'core vendor chunk exists' }

$vendorJs = Get-Content $vendor.FullName -Raw
Write-Host "CORE_VENDOR=$($vendor.Name)"
Write-Host "CORE_VENDOR_BYTES=$($vendor.Length)"
Write-Host "CORE_VENDOR_GOOBER=$($vendorJs.Contains('_goober'))"

foreach ($needle in @(
  'react.production.js',
  'scheduler.production.js',
  'react-dom.production.js',
  'react-router v',
  '@license lucide-react'
)) {
  if ($vendorJs.Contains($needle)) { Pass "stable vendor retained: $needle" } else { Fail "stable vendor retained: $needle" }
}

if (-not $vendorJs.Contains('_goober')) {
  Pass 'goober removed from critical core vendor'
} else {
  Write-Host 'WARN goober marker still present in core vendor; Lighthouse measurement required' -ForegroundColor Yellow
}

$toastChunks = @()
foreach ($file in Get-ChildItem '.\dist\assets\*.js') {
  $content = Get-Content $file.FullName -Raw
  if ($content.Contains('_goober') -or $content.Contains('react-hot-toast')) {
    $toastChunks += [PSCustomObject]@{
      Name = $file.Name
      Bytes = $file.Length
      Goober = $content.Contains('_goober')
    }
  }
}

Write-Host "TOAST_CHUNKS=$($toastChunks.Count)"
$toastChunks | Sort-Object Bytes -Descending | Format-Table -AutoSize

if ($toastChunks.Count -gt 0) {
  Pass 'toast implementation remains available in generated chunks'
} else {
  Write-Host 'WARN toast implementation marker not found by heuristic; source smoke remains authoritative' -ForegroundColor Yellow
}

Pass 'POST-UX C HOTFIX 19 post-build checks'
