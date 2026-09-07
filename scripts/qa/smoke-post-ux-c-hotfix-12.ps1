$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail([string]$message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }

$required = @(
  'src\index.css',
  'src\App.tsx',
  'src\pages\store\ProductDetailPage.tsx',
  'scripts\qa\smoke-post-ux-c-hotfix-11.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-10.ps1'
)

foreach ($file in $required) {
  if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" }
}

$css = Get-Content 'src\index.css' -Raw
$app = Get-Content 'src\App.tsx' -Raw
$pdp = Get-Content 'src\pages\store\ProductDetailPage.tsx' -Raw

if ($css.Contains('Material+Symbols+Outlined')) { Fail 'Material Symbols Google Fonts import removed' } else { Pass 'Material Symbols Google Fonts import removed' }
if ($app.Contains('material-symbols-outlined')) { Fail 'Material Symbols runtime class removed' } else { Pass 'Material Symbols runtime class removed' }

foreach ($needle in @(
  "from 'lucide-react'",
  'ShoppingBag',
  'Trash2',
  '<ShoppingBag size={28} aria-hidden="true" />',
  '<Trash2 size={18} aria-hidden="true" />'
)) {
  if ($app.Contains($needle)) { Pass "lucide replacement retained: $needle" } else { Fail "lucide replacement retained: $needle" }
}

foreach ($needle in @(
  'POST-UX C HOTFIX 11: early PDP product discovery',
  'window.__SELFCARE_EARLY_PRODUCT__',
  'queryFn: consumeEarlyProduct',
  'staleTime: 30_000'
)) {
  $source = if ($needle -like 'POST-UX*' -or $needle -like 'window*') { Get-Content 'index.html' -Raw } else { $pdp }
  if ($source.Contains($needle)) { Pass "HOTFIX 11 retained: $needle" } else { Fail "HOTFIX 11 retained: $needle" }
}

foreach ($needle in @(
  'getResponsiveProductImage',
  'srcSet={mainImage.srcSet}',
  'sizes={mainImage.sizes}',
  'fetchPriority="high" loading="eager" decoding="async"',
  'LazyReviewList',
  'LazyReviewForm'
)) {
  if ($pdp.Contains($needle)) { Pass "PDP protected behavior retained: $needle" } else { Fail "PDP protected behavior retained: $needle" }
}

Pass 'POST-UX C HOTFIX 12 render-blocking Material Symbols removal checks'
