
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail($message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }

$home = Get-Content "src\pages\store\HomePage.tsx" -Raw
$product = Get-Content "src\pages\store\ProductDetailPage.tsx" -Raw

if ($home.Contains('heroProduct.images[0]} alt={heroProduct.name} />')) {
  Pass "home forced hero priority rolled back"
} else {
  Fail "home hero rollback missing"
}

if ($home.Contains('heroProduct.images[0]} alt={heroProduct.name} fetchPriority="high"')) {
  Fail "home hero still forces high fetch priority"
} else {
  Pass "home hero no longer forces high fetch priority"
}

if ($product.Contains('if (isProductLoading) return')) {
  Pass "product render waits only for product request"
} else {
  Fail "product critical render gate not optimized"
}

if ($product.Contains('isStoreLoading || isProductLoading')) {
  Fail "store config still blocks product critical render"
} else {
  Pass "store config removed from product critical render gate"
}

if ($product.Contains('fetchPriority="high" loading="eager" decoding="async"')) {
  Pass "product primary LCP priority retained"
} else {
  Fail "product primary LCP priority missing"
}

if ($product.Contains('secondaryContentReady')) {
  Pass "product secondary request deferral retained"
} else {
  Fail "product secondary request deferral missing"
}

Pass "POST-UX C Iteration 03 - critical render dependency checks"
