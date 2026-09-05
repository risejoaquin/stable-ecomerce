$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$appPath = "src\App.tsx"
$lazyPath = "src\routes\lazy-routes.tsx"
$indexPath = "index.html"

foreach ($path in @($appPath, $lazyPath, $indexPath)) {
  if (!(Test-Path $path)) { Fail "required file exists: $path" }
  Pass "required file exists: $path"
}

$app = Get-Content -Raw -LiteralPath $appPath
$lazy = Get-Content -Raw -LiteralPath $lazyPath
$index = Get-Content -Raw -LiteralPath $indexPath

if ($app.Contains("import { ProductDetailPage } from './pages/store/ProductDetailPage';")) {
  Pass "ProductDetailPage direct import retained"
} else { Fail "ProductDetailPage direct import retained" }

if (!$app.Contains("LazyProductDetailPage")) {
  Pass "App has no LazyProductDetailPage reference"
} else { Fail "App has no LazyProductDetailPage reference" }

if (!$lazy.Contains("LazyProductDetailPage")) {
  Pass "LazyProductDetailPage export removed"
} else { Fail "LazyProductDetailPage export removed" }

if (!$lazy.Contains("import('../pages/store/ProductDetailPage')")) {
  Pass "ProductDetailPage dynamic route import removed"
} else { Fail "ProductDetailPage dynamic route import removed" }

if ($app.Contains('<Route path="/product/:id" element={<ProductDetailPage />} />') -and
    $app.Contains('<Route path="/product/:id/:slug" element={<ProductDetailPage />} />')) {
  Pass "both product routes remain eager"
} else { Fail "both product routes remain eager" }

if ($index.Contains('rel="preconnect" href="https://dporfgsbwsyqzmlnqrug.supabase.co"')) {
  Pass "Supabase preconnect retained"
} else { Fail "Supabase preconnect retained" }

if ($lazy.Contains("LazyHomePage") -and $lazy.Contains("LazyAdminDashboard") -and $lazy.Contains("LazyAdminEmailCenterPage")) {
  Pass "other lazy routes retained"
} else { Fail "other lazy routes retained" }

Pass "POST-UX C ITERATION 12 HOTFIX 09.1 lazy export cleanup checks"
