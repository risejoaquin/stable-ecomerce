$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$vendor = Get-ChildItem '.\dist\assets\vendor-*.js' |
  Where-Object { $_.Name -notmatch 'vendor-(ui|query|charts|commerce|observability)' } |
  Sort-Object Length -Descending |
  Select-Object -First 1

if (-not $vendor) { Fail 'core vendor chunk exists after build' }
Pass "core vendor chunk exists: $($vendor.Name)"

$js = Get-Content $vendor.FullName -Raw
$lucideLicenseCount = ([regex]::Matches($js, '@license lucide-react')).Count

Write-Host "CORE_VENDOR=$($vendor.Name)"
Write-Host "CORE_VENDOR_BYTES=$($vendor.Length)"
Write-Host "CORE_VENDOR_LUCIDE_LICENSES=$lucideLicenseCount"

if ($lucideLicenseCount -eq 0) {
  Pass 'core vendor no longer contains lucide icon modules'
} else {
  Fail "core vendor still contains $lucideLicenseCount lucide icon modules"
}

foreach ($needle in @(
  'react.production.js',
  'scheduler.production.js',
  'react-dom.production.js',
  'react-router v'
)) {
  if ($js.Contains($needle)) { Pass "stable core retained: $needle" } else { Fail "stable core retained: $needle" }
}

$allJs = Get-ChildItem '.\dist\assets\*.js'
$lucideFiles = @()
foreach ($file in $allJs) {
  $content = Get-Content $file.FullName -Raw
  if ($content.Contains('@license lucide-react')) {
    $count = ([regex]::Matches($content, '@license lucide-react')).Count
    $lucideFiles += [PSCustomObject]@{
      Name = $file.Name
      Bytes = $file.Length
      LucideLicenses = $count
    }
  }
}

if ($lucideFiles.Count -gt 0) {
  Pass "lucide modules remain available across natural chunks: $($lucideFiles.Count) chunk(s)"
  $lucideFiles | Sort-Object Bytes -Descending | Format-Table -AutoSize
} else {
  Fail 'lucide modules remain available after build'
}

Pass 'POST-UX C HOTFIX 18 post-build bundle checks'
