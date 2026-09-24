$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$qa = Get-Content '.\scripts\qa\smoke-post-ux-c-hotfix-20.ps1' -Raw
$pdp = Get-Content '.\src\pages\store\ProductDetailPage.tsx' -Raw

foreach ($needle in @(
  'POST-UX C HOTFIX 20.2: successor-aware structural QA repair',
  '$similarIndex',
  '$reviewIndex',
  '$footerIndex',
  '$mobileNavIndex',
  '$cartIndex',
  "Pass 'mobile nav and cart remain after deferred below-fold region'"
)) {
  if ($qa.Contains($needle)) { Pass "HOTFIX 20.2 QA contract: $needle" } else { Fail "HOTFIX 20.2 QA contract: $needle" }
}

if (-not $qa.Contains('$expected = "</>\n        )}\n\n        <MobileEditorialNav"')) {
  Pass 'fragile whitespace-sensitive mobile-nav assertion removed'
} else {
  Fail 'fragile whitespace-sensitive mobile-nav assertion removed'
}

$gateIndex = $pdp.IndexOf('{secondaryContentReady && (')
$similarIndex = $pdp.IndexOf('{similarProducts.length > 0 && (')
$reviewIndex = $pdp.IndexOf('<LazyReviewList')
$footerIndex = $pdp.IndexOf('<EditorialFooter')
$mobileNavIndex = $pdp.IndexOf('<MobileEditorialNav')
$cartIndex = $pdp.IndexOf('<CartDrawer')

if ($gateIndex -ge 0 -and
    $similarIndex -gt $gateIndex -and
    $reviewIndex -gt $gateIndex -and
    $footerIndex -gt $gateIndex -and
    $mobileNavIndex -gt $footerIndex -and
    $cartIndex -gt $mobileNavIndex) {
  Pass 'current PDP structural ordering is valid'
} else {
  Fail 'current PDP structural ordering is valid'
}

Pass 'POST-UX C HOTFIX 20.2 QA repair checks'
