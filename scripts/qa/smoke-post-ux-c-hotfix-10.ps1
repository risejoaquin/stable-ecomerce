$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail([string]$message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }

$required = @(
  "package.json",
  "server.ts",
  "src\components\admin\ProductFormModal.tsx",
  "src\pages\store\ProductDetailPage.tsx",
  "src\lib\product-image.ts"
)

foreach ($file in $required) {
  if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" }
}

$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$server = Get-Content "server.ts" -Raw
$form = Get-Content "src\components\admin\ProductFormModal.tsx" -Raw
$pdp = Get-Content "src\pages\store\ProductDetailPage.tsx" -Raw
$helper = Get-Content "src\lib\product-image.ts" -Raw

if ($pkg.dependencies.sharp) { Pass "sharp dependency declared: $($pkg.dependencies.sharp)" } else { Fail "sharp dependency declared" }

$serverChecks = @(
  "import sharp from 'sharp';",
  "POST-UX C HOTFIX 10: responsive product image upload pipeline",
  "'/api/upload/product-image'",
  "multer.memoryStorage()",
  ".from('products')",
  "cacheControl: '31536000'",
  ".webp({",
  "quality: width <= 480 ? 78 : width <= 800 ? 80 : 82",
  "responsive:",
  "originalUrl"
)
foreach ($needle in $serverChecks) {
  if ($server.Contains($needle)) { Pass "server image pipeline: $needle" } else { Fail "server image pipeline: $needle" }
}

if ($form.Contains("fetch('/api/upload/product-image'")) { Pass "ProductFormModal uses optimized image endpoint" } else { Fail "ProductFormModal uses optimized image endpoint" }

$pdpChecks = @(
  "getResponsiveProductImage",
  "const mainImage = getResponsiveProductImage",
  "srcSet={mainImage.srcSet}",
  "sizes={mainImage.sizes}",
  'fetchPriority="high" loading="eager" decoding="async"',
  "mainImage.fallbackSrc"
)
foreach ($needle in $pdpChecks) {
  if ($pdp.Contains($needle)) { Pass "PDP responsive image contract: $needle" } else { Fail "PDP responsive image contract: $needle" }
}

$helperChecks = @(
  "RESPONSIVE_PRODUCT_RE",
  "[480, 800, 1200]",
  "'(max-width: 768px) 100vw, 50vw'",
  "fallbackSrc"
)
foreach ($needle in $helperChecks) {
  if ($helper.Contains($needle)) { Pass "responsive image helper: $needle" } else { Fail "responsive image helper: $needle" }
}

# Protected performance behavior must remain.
foreach ($needle in @(
  "LazyReviewList",
  "LazyReviewForm",
  "secondaryContentReady ? store?.slug : undefined",
  "useProductRating(secondaryContentReady ? (id || '') : '')"
)) {
  if ($pdp.Contains($needle)) { Pass "protected PDP behavior retained: $needle" } else { Fail "protected PDP behavior retained: $needle" }
}

Pass "POST-UX C HOTFIX 10 responsive product image pipeline checks"
