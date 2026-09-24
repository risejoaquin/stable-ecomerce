$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$pdpPath = '.\src\pages\store\ProductDetailPage.tsx'
if (-not (Test-Path $pdpPath)) { Fail 'ProductDetailPage exists' }
$pdp = Get-Content $pdpPath -Raw

foreach ($needle in @(
  'const [secondaryContentReady, setSecondaryContentReady] = useState(false);',
  'requestIdleCallback',
  'setSecondaryContentReady(true)',
  '{secondaryContentReady && (',
  '{similarProducts.length > 0 && (',
  '<LazyReviewList',
  '<LazyReviewForm',
  '<EditorialFooter',
  '<MobileEditorialNav',
  '<CartDrawer'
)) {
  if ($pdp.Contains($needle)) { Pass "PDP HOTFIX 20.1 contract: $needle" } else { Fail "PDP HOTFIX 20.1 contract: $needle" }
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
    $footerIndex -gt $gateIndex) {
  Pass 'similar products, reviews and footer are behind secondaryContentReady gate'
} else {
  Fail 'similar products, reviews and footer are behind secondaryContentReady gate'
}

if ($mobileNavIndex -gt $footerIndex -and $cartIndex -gt $mobileNavIndex) {
  Pass 'MobileEditorialNav and CartDrawer remain after deferred below-fold region'
} else {
  Fail 'MobileEditorialNav and CartDrawer ordering preserved'
}

if ($pdp -match 'fetchPriority="high" loading="eager" decoding="async"') {
  Pass 'PDP LCP image priority contract retained'
} else {
  Fail 'PDP LCP image priority contract retained'
}

Pass 'POST-UX C HOTFIX 20.1 source checks'
