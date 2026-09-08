$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$pdp = Get-Content '.\src\pages\store\ProductDetailPage.tsx' -Raw

foreach ($needle in @(
  'const [secondaryContentReady, setSecondaryContentReady] = useState(false);',
  'requestIdleCallback',
  'setSecondaryContentReady(true)',
  '{secondaryContentReady && (',
  '<LazyReviewList',
  '<LazyReviewForm',
  '<EditorialFooter',
  '<MobileEditorialNav',
  '<CartDrawer'
)) {
  if ($pdp.Contains($needle)) { Pass "PDP HOTFIX 20 contract: $needle" } else { Fail "PDP HOTFIX 20 contract: $needle" }
}

# POST-UX C HOTFIX 20.2: successor-aware structural QA repair
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

# HOTFIX 20.1 preserves existing JSX but may reindent the deferred region.
# Validate semantic ordering instead of one exact whitespace-sensitive closing string.
if ($mobileNavIndex -gt $footerIndex -and $cartIndex -gt $mobileNavIndex) {
  Pass 'mobile nav and cart remain after deferred below-fold region'
} else {
  Fail 'mobile nav and cart remain after deferred below-fold region'
}

if ($pdp -match 'fetchPriority="high" loading="eager" decoding="async"') {
  Pass 'PDP LCP image priority contract retained'
} else {
  Fail 'PDP LCP image priority contract retained'
}

Pass 'POST-UX C HOTFIX 20 source checks'
