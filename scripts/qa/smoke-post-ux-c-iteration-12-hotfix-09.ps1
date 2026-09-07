$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$appPath = "src\App.tsx"
$lazyPath = "src\routes\lazy-routes.tsx"
$indexPath = "index.html"
$pdpPath = "src\pages\store\ProductDetailPage.tsx"

foreach ($path in @($appPath, $lazyPath, $indexPath, $pdpPath)) {
  if (!(Test-Path $path)) { Fail "required file exists: $path" }
  Pass "required file exists: $path"
}

$app = Get-Content -Raw -LiteralPath $appPath
$lazy = Get-Content -Raw -LiteralPath $lazyPath
$index = Get-Content -Raw -LiteralPath $indexPath
$pdp = Get-Content -Raw -LiteralPath $pdpPath

if ($app.Contains("import { ProductDetailPage } from './pages/store/ProductDetailPage';")) {
  Pass "ProductDetailPage imported directly"
} else { Fail "ProductDetailPage imported directly" }

if (!$app.Contains("LazyProductDetailPage")) {
  Pass "App no longer references LazyProductDetailPage"
} else { Fail "App no longer references LazyProductDetailPage" }

if ($app.Contains('<Route path="/product/:id" element={<ProductDetailPage />} />')) {
  Pass "product id route uses eager ProductDetailPage"
} else { Fail "product id route uses eager ProductDetailPage" }

if ($app.Contains('<Route path="/product/:id/:slug" element={<ProductDetailPage />} />')) {
  Pass "product slug route uses eager ProductDetailPage"
} else { Fail "product slug route uses eager ProductDetailPage" }

if (!$lazy.Contains("LazyProductDetailPage") -and !$lazy.Contains("pages/store/ProductDetailPage")) {
  Pass "ProductDetailPage removed from lazy route registry"
} else { Fail "ProductDetailPage removed from lazy route registry" }

if ($index.Contains('rel="preconnect" href="https://dporfgsbwsyqzmlnqrug.supabase.co"')) {
  Pass "Supabase storage preconnect exists"
} else { Fail "Supabase storage preconnect exists" }

foreach ($needle in @(
  'fetchPriority="high" loading="eager" decoding="async"',
  "secondaryContentReady ? store?.slug : undefined",
  "useProductRating(secondaryContentReady ? (id || '') : '')",
  "LazyReviewList",
  "LazyReviewForm"
)) {
  if ($pdp.Contains($needle)) { Pass "PDP optimization retained: $needle" }
  else { Fail "PDP optimization retained: $needle" }
}

if ($lazy.Contains("LazyHomePage") -and $lazy.Contains("LazyAdminDashboard") -and $lazy.Contains("LazyAdminEmailCenterPage")) {
  Pass "non-PDP lazy routes retained"
} else { Fail "non-PDP lazy routes retained" }

Pass "POST-UX C ITERATION 12 HOTFIX 09 PDP discovery path checks"
