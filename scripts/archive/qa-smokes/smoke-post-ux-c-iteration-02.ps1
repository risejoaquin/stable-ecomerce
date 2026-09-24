
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail($message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }
function Assert-Contains($path, $text, $message) {
  if (!(Test-Path $path)) { Fail "$message ($path missing)" }
  $content = Get-Content $path -Raw
  if ($content.Contains($text)) { Pass $message } else { Fail "$message" }
}

Assert-Contains "src\pages\store\HomePage.tsx" 'fetchPriority="high" loading="eager" decoding="async"' "home hero LCP image prioritized"
Assert-Contains "src\pages\store\ProductDetailPage.tsx" 'secondaryContentReady' "product secondary-content gate exists"
Assert-Contains "src\pages\store\ProductDetailPage.tsx" 'requestIdleCallback' "product secondary requests defer to idle"
Assert-Contains "src\pages\store\ProductDetailPage.tsx" 'useProductRating(secondaryContentReady ?' "product rating request deferred"
Assert-Contains "src\pages\store\ProductDetailPage.tsx" 'secondaryContentReady ? store?.slug : undefined' "similar products request deferred"
Assert-Contains "src\pages\store\ProductDetailPage.tsx" 'fetchPriority="high" loading="eager" decoding="async"' "product primary LCP image prioritized"
Assert-Contains "src\pages\store\ProductDetailPage.tsx" 'loading="lazy" fetchPriority="low" decoding="async"' "product thumbnails deprioritized"

Pass "POST-UX C Iteration 02 - mobile LCP prioritization checks"
