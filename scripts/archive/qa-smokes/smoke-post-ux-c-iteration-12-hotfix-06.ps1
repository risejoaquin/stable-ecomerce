$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "src\pages\store\ProductDetailPage.tsx"
if (!(Test-Path $path)) { Fail "ProductDetailPage exists" }
$source = Get-Content -Raw -LiteralPath $path
Pass "ProductDetailPage exists"

$required = @(
  @("Suspense, lazy", "React lazy primitives restored"),
  @("secondaryContentReady", "secondary-content gate restored"),
  @("requestIdleCallback", "idle secondary-content scheduling restored"),
  @("secondaryContentReady ? (id || '') : ''", "rating request deferred"),
  @("secondaryContentReady ? store?.slug : undefined", "similar products request deferred"),
  @("if (isProductLoading)", "PDP only waits for product request"),
  @('fetchPriority="high" loading="eager" decoding="async"', "primary PDP LCP image prioritized"),
  @('loading="lazy" fetchPriority="low" decoding="async"', "PDP thumbnails deprioritized"),
  @("LazyReviewList", "ReviewList lazy declaration restored"),
  @("LazyReviewForm", "ReviewForm lazy declaration restored"),
  @("<Suspense fallback={null}><LazyReviewList", "ReviewList lazy render restored"),
  @("<Suspense fallback={null}><LazyReviewForm", "ReviewForm lazy render restored")
)

foreach ($check in $required) {
  if ($source.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

if ($source.Contains("import { ReviewList } from '../../components/reviews/ReviewList';")) {
  Fail "eager ReviewList import removed"
} else { Pass "eager ReviewList import removed" }

if ($source.Contains("import { ReviewForm } from '../../components/reviews/ReviewForm';")) {
  Fail "eager ReviewForm import removed"
} else { Pass "eager ReviewForm import removed" }

if ($source.Contains("isStoreLoading || isProductLoading")) {
  Fail "store config removed from critical PDP gate"
} else { Pass "store config removed from critical PDP gate" }

Pass "POST-UX C ITERATION 12 HOTFIX 06 PDP regression restoration checks"
