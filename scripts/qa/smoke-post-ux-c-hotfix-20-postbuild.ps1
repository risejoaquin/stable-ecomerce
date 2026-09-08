$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$reviewList = Get-ChildItem '.\dist\assets\ReviewList-*.js' | Select-Object -First 1
$reviewForm = Get-ChildItem '.\dist\assets\ReviewForm-*.js' | Select-Object -First 1
$core = Get-ChildItem '.\dist\assets\vendor-*.js' |
  Where-Object { $_.Name -notmatch 'vendor-(ui|query|charts|commerce|observability)' } |
  Sort-Object Length -Descending |
  Select-Object -First 1

if ($reviewList) { Pass "ReviewList remains lazy chunk: $($reviewList.Name)" } else { Fail 'ReviewList remains lazy chunk' }
if ($reviewForm) { Pass "ReviewForm remains lazy chunk: $($reviewForm.Name)" } else { Fail 'ReviewForm remains lazy chunk' }
if ($core) {
  Write-Host "CORE_VENDOR=$($core.Name)"
  Write-Host "CORE_VENDOR_BYTES=$($core.Length)"
  Pass 'stable core vendor exists'
} else {
  Fail 'stable core vendor exists'
}

Pass 'POST-UX C HOTFIX 20 post-build checks'
