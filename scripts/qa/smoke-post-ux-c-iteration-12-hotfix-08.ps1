$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "src\pages\store\ProductDetailPage.tsx"
if (!(Test-Path $path)) { Fail "ProductDetailPage exists" }

$source = Get-Content -Raw -LiteralPath $path
Pass "ProductDetailPage exists"

$declaration = "const [secondaryContentReady, setSecondaryContentReady] = useState(false);"
$usage = "useProductRating(secondaryContentReady ? (id || '') : '')"

$declarationIndex = $source.IndexOf($declaration)
$usageIndex = $source.IndexOf($usage)

if ($declarationIndex -lt 0) { Fail "secondaryContentReady declaration exists" }
Pass "secondaryContentReady declaration exists"

if ($usageIndex -lt 0) { Fail "deferred rating usage exists" }
Pass "deferred rating usage exists"

if ($declarationIndex -lt $usageIndex) {
  Pass "secondaryContentReady declared before first deferred rating usage"
} else {
  Fail "secondaryContentReady declared before first deferred rating usage"
}

foreach ($needle in @(
  "requestIdleCallback",
  "secondaryContentReady ? store?.slug : undefined",
  'fetchPriority="high" loading="eager" decoding="async"',
  "LazyReviewList",
  "LazyReviewForm"
)) {
  if ($source.Contains($needle)) { Pass "PDP optimization retained: $needle" }
  else { Fail "PDP optimization retained: $needle" }
}

Pass "POST-UX C ITERATION 12 HOTFIX 08 runtime declaration-order regression checks"
