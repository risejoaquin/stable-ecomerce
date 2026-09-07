$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "src\pages\store\ProductDetailPage.tsx"
if (!(Test-Path $path)) { Fail "ProductDetailPage exists" }

$source = Get-Content -Raw -LiteralPath $path
Pass "ProductDetailPage exists"

if ($source.Contains("import { ReviewList } from '../../components/reviews/ReviewList';")) {
  Fail "eager ReviewList import removed"
} else {
  Pass "eager ReviewList import removed"
}

if ($source.Contains("import { ReviewForm } from '../../components/reviews/ReviewForm';")) {
  Fail "eager ReviewForm import removed"
} else {
  Pass "eager ReviewForm import removed"
}

foreach ($needle in @(
  "const LazyReviewList = lazy(() =>",
  "const LazyReviewForm = lazy(() =>",
  "import('../../components/reviews/ReviewList')",
  "import('../../components/reviews/ReviewForm')",
  "<Suspense fallback={null}><LazyReviewList",
  "<Suspense fallback={null}><LazyReviewForm"
)) {
  if ($source.Contains($needle)) {
    Pass "lazy review contract retained: $needle"
  } else {
    Fail "lazy review contract missing: $needle"
  }
}

Pass "POST-UX C ITERATION 12 HOTFIX 07 eager review import cleanup checks"
