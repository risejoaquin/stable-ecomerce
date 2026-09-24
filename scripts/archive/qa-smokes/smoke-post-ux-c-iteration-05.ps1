$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$homeSource = [System.IO.File]::ReadAllText(
  (Resolve-Path "src\pages\store\HomePage.tsx").Path,
  [System.Text.Encoding]::UTF8
)

$productSource = [System.IO.File]::ReadAllText(
  (Resolve-Path "src\pages\store\ProductDetailPage.tsx").Path,
  [System.Text.Encoding]::UTF8
)

foreach ($check in @(
  @("LazyRoutineCards", "home routine section lazy"),
  @("LazyShopByConcern", "home concern section lazy"),
  @("LazyEditorialLookbookSection", "home lookbook section lazy"),
  @("LazyStorefrontNewsletter", "home newsletter section lazy"),
  @("Suspense", "home Suspense boundary exists")
)) {
  if ($homeSource.Contains($check[0])) {
    Pass $check[1]
  } else {
    Fail $check[1]
  }
}

foreach ($eagerImport in @(
  "import { EditorialLookbookSection }",
  "import { RoutineCards }",
  "import { ShopByConcern }",
  "import { StorefrontNewsletter }"
)) {
  if ($homeSource.Contains($eagerImport)) {
    Fail "home eager import remains: $eagerImport"
  }
}
Pass "home below-fold eager imports removed"

foreach ($check in @(
  @("LazyReviewList", "product review list lazy"),
  @("LazyReviewForm", "product review form lazy"),
  @("secondaryContentReady", "product secondary request deferral retained"),
  @('fetchPriority="high" loading="eager" decoding="async"', "product LCP image priority retained")
)) {
  if ($productSource.Contains($check[0])) {
    Pass $check[1]
  } else {
    Fail $check[1]
  }
}

foreach ($eagerImport in @(
  "import { ReviewList }",
  "import { ReviewForm }"
)) {
  if ($productSource.Contains($eagerImport)) {
    Fail "product eager import remains: $eagerImport"
  }
}
Pass "product review eager imports removed"

foreach ($sourceItem in @(
  @("HomePage", $homeSource),
  @("ProductDetailPage", $productSource)
)) {
  foreach ($codePoint in @(0x00C3, 0x00C2, 0x00E2)) {
    $marker = [string][char]$codePoint
    if ($sourceItem[1].Contains($marker)) {
      Fail ("possible mojibake marker U+{0:X4} found in {1}" -f $codePoint, $sourceItem[0])
    }
  }

  Pass "UTF-8 integrity retained: $($sourceItem[0])"
}

Pass "POST-UX C Iteration 05 - unused JavaScript reduction checks"
