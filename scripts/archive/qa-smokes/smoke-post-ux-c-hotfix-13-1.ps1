$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail([string]$message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }

$required = @(
  'index.html',
  'src\styles\uix-soft-premium-system.css',
  'src\index.css',
  'src\App.tsx',
  'src\pages\store\ProductDetailPage.tsx',
  'scripts\qa\smoke-post-ux-c-hotfix-12.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-11.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-10.ps1'
)

foreach ($file in $required) {
  if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" }
}

$html = Get-Content 'index.html' -Raw
$uix = Get-Content 'src\styles\uix-soft-premium-system.css' -Raw
$indexCss = Get-Content 'src\index.css' -Raw
$app = Get-Content 'src\App.tsx' -Raw
$pdp = Get-Content 'src\pages\store\ProductDetailPage.tsx' -Raw

if ($uix -match '(?im)^\s*@import\s+url\([^\r\n]*fonts\.googleapis\.com') { Fail 'active UIX Google Fonts @import removed' } else { Pass 'active UIX Google Fonts @import removed' }

foreach ($needle in @(
  'POST-UX C HOTFIX 13: non-blocking brand fonts',
  'rel="preload" as="style"',
  'family=Archivo+Black&family=Inter',
  'media="print"',
  '<noscript><link rel="stylesheet"'
)) {
  if ($html.Contains($needle)) { Pass "non-blocking font loader retained: $needle" } else { Fail "non-blocking font loader retained: $needle" }
}

$fontUrlMatches = [regex]::Matches($html, 'https://fonts\.googleapis\.com/css2\?family=Archivo\+Black&family=Inter:[^"'']+').Count
if ($fontUrlMatches -ge 2) { Pass "brand font URL available for async + noscript loading" } else { Fail "brand font URL available for async + noscript loading" }

foreach ($needle in @(
  'font-family: Inter',
  "font-family: 'Archivo Black'"
)) {
  if ($uix.Contains($needle)) { Pass "brand typography retained: $needle" } else { Fail "brand typography retained: $needle" }
}

if ($indexCss.Contains('Material+Symbols+Outlined')) { Fail 'HOTFIX 12 Material Symbols removal retained' } else { Pass 'HOTFIX 12 Material Symbols removal retained' }
if ($app.Contains('material-symbols-outlined')) { Fail 'HOTFIX 12 runtime Material Symbols removal retained' } else { Pass 'HOTFIX 12 runtime Material Symbols removal retained' }
foreach ($needle in @('ShoppingBag','Trash2')) {
  if ($app.Contains($needle)) { Pass "HOTFIX 12 lucide icon retained: $needle" } else { Fail "HOTFIX 12 lucide icon retained: $needle" }
}

foreach ($needle in @(
  'window.__SELFCARE_EARLY_PRODUCT__',
  'queryFn: consumeEarlyProduct',
  'staleTime: 30_000',
  'getResponsiveProductImage',
  'srcSet={mainImage.srcSet}',
  'sizes={mainImage.sizes}',
  'fetchPriority="high" loading="eager" decoding="async"',
  'LazyReviewList',
  'LazyReviewForm'
)) {
  $source = if ($needle -eq 'window.__SELFCARE_EARLY_PRODUCT__') { $html } else { $pdp }
  if ($source.Contains($needle)) { Pass "protected PDP behavior retained: $needle" } else { Fail "protected PDP behavior retained: $needle" }
}

Pass 'POST-UX C HOTFIX 13.1 repaired non-blocking brand font checks'
