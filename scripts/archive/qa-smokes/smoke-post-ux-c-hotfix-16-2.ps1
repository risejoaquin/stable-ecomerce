$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$smoke15 = Get-Content '.\scripts\qa\smoke-post-ux-c-hotfix-15.ps1' -Raw
$smoke151 = Get-Content '.\scripts\qa\smoke-post-ux-c-hotfix-15-1.ps1' -Raw

foreach ($needle in @(
  'POST-UX C HOTFIX 16.2: HOTFIX 15 successor-aware QA contract',
  'images-only or full-product successor'
)) {
  if ($smoke15.Contains($needle)) { Pass "HOTFIX 15 QA repair: $needle" } else { Fail "HOTFIX 15 QA repair: $needle" }
}

foreach ($needle in @(
  'POST-UX C HOTFIX 16.2: HOTFIX 15.1 successor-aware QA contract',
  'legacy image cache or HOTFIX 16 product cache successor'
)) {
  if ($smoke151.Contains($needle)) { Pass "HOTFIX 15.1 QA repair: $needle" } else { Fail "HOTFIX 15.1 QA repair: $needle" }
}

& ".\scripts\qa\smoke-post-ux-c-hotfix-15.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 15 successor-aware regression' }
Pass 'HOTFIX 15 successor-aware regression'

& ".\scripts\qa\smoke-post-ux-c-hotfix-15-1.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 15.1 successor-aware regression' }
Pass 'HOTFIX 15.1 successor-aware regression'

& ".\scripts\qa\smoke-post-ux-c-hotfix-16.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 16 regression' }
Pass 'HOTFIX 16 regression'

& ".\scripts\qa\smoke-post-ux-c-hotfix-16-1.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 16.1 regression' }
Pass 'HOTFIX 16.1 regression'

Pass 'POST-UX C HOTFIX 16.2 QA contract repair checks'
