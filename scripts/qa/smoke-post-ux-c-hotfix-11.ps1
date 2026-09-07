$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail([string]$message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }

$required = @(
  'index.html',
  'src\pages\store\ProductDetailPage.tsx',
  'src\lib\product-image.ts',
  'scripts\qa\smoke-post-ux-c-hotfix-10.ps1'
)

foreach ($file in $required) {
  if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" }
}

$index = Get-Content 'index.html' -Raw
$pdp = Get-Content 'src\pages\store\ProductDetailPage.tsx' -Raw

$indexChecks = @(
  'POST-UX C HOTFIX 11: early PDP product discovery',
  '/^\/product\/([0-9a-f-]{36})(?:\/|$)/i',
  '/api/products/',
  "credentials: 'same-origin'",
  'window.__SELFCARE_EARLY_PRODUCT__',
  'promise.catch(() => {})'
)

foreach ($needle in $indexChecks) {
  if ($index.Contains($needle)) { Pass "early bootstrap: $needle" } else { Fail "early bootstrap: $needle" }
}

$pdpChecks = @(
  'type EarlyProductBootstrap',
  '__SELFCARE_EARLY_PRODUCT__?: EarlyProductBootstrap',
  'const consumeEarlyProduct = async',
  'if (early?.id === id)',
  'return await early.promise',
  'delete window.__SELFCARE_EARLY_PRODUCT__',
  'queryFn: consumeEarlyProduct',
  'staleTime: 30_000'
)

foreach ($needle in $pdpChecks) {
  if ($pdp.Contains($needle)) { Pass "PDP critical path: $needle" } else { Fail "PDP critical path: $needle" }
}

# HOTFIX 10 image pipeline must remain untouched.
$imageChecks = @(
  'getResponsiveProductImage',
  'const mainImage = getResponsiveProductImage',
  'srcSet={mainImage.srcSet}',
  'sizes={mainImage.sizes}',
  'fetchPriority="high" loading="eager" decoding="async"',
  'mainImage.fallbackSrc'
)

foreach ($needle in $imageChecks) {
  if ($pdp.Contains($needle)) { Pass "HOTFIX 10 retained: $needle" } else { Fail "HOTFIX 10 retained: $needle" }
}

# Existing secondary-content deferral must remain.
$protectedChecks = @(
  'LazyReviewList',
  'LazyReviewForm',
  'secondaryContentReady ? store?.slug : undefined',
  "useProductRating(secondaryContentReady ? (id || '') : '')"
)

foreach ($needle in $protectedChecks) {
  if ($pdp.Contains($needle)) { Pass "protected PDP behavior retained: $needle" } else { Fail "protected PDP behavior retained: $needle" }
}

Pass 'POST-UX C HOTFIX 11 PDP early product discovery checks'
