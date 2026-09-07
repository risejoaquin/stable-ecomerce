$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$required = @(
  'index.html',
  'src\pages\store\ProductDetailPage.tsx',
  'src\lib\product-image.ts',
  'scripts\qa\smoke-post-ux-c-hotfix-13-2-1.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-13-2.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-13-1.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-12.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-11.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-10.ps1'
)

foreach ($file in $required) {
  if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" }
}

$html = Get-Content 'index.html' -Raw
$pdp = Get-Content 'src\pages\store\ProductDetailPage.tsx' -Raw

foreach ($needle in @(
  'data-selfcare-pdp-lcp-preload',
  "preload.rel = 'preload'",
  "preload.as = 'image'",
  "preload.fetchPriority = 'high'",
  "preload.imageSrcset = widths.map((width) => base + width + '.webp ' + width + 'w').join(', ')",
  "preload.imageSizes = '(max-width: 768px) 100vw, 50vw'",
  'document.head.appendChild(preload)',
  'return product;'
)) {
  if ($html.Contains($needle)) { Pass "early LCP preload retained: $needle" } else { Fail "early LCP preload retained: $needle" }
}

foreach ($needle in @(
  'window.__SELFCARE_EARLY_PRODUCT__',
  'credentials: ''same-origin''',
  'promise.catch(() => {})'
)) {
  if ($html.Contains($needle)) { Pass "HOTFIX 11 early discovery retained: $needle" } else { Fail "HOTFIX 11 early discovery retained: $needle" }
}

foreach ($needle in @(
  'getResponsiveProductImage',
  'srcSet={mainImage.srcSet}',
  'sizes={mainImage.sizes}',
  'fetchPriority="high" loading="eager" decoding="async"'
)) {
  if ($pdp.Contains($needle)) { Pass "PDP image contract retained: $needle" } else { Fail "PDP image contract retained: $needle" }
}

if ($html -match '(?i)onload\s*=') { Fail 'CSP-safe HTML remains free of inline onload handlers' } else { Pass 'CSP-safe HTML remains free of inline onload handlers' }
if ($html.Contains('src="/brand-fonts-loader.js" defer')) { Pass 'HOTFIX 13.2 CSP-safe font loader retained' } else { Fail 'HOTFIX 13.2 CSP-safe font loader retained' }

Pass 'POST-UX C HOTFIX 14.2 safe early PDP LCP image preload checks'
