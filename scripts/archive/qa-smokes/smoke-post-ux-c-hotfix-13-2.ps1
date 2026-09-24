$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
function Pass([string]$message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail([string]$message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }

$required = @(
  'index.html',
  'public\brand-fonts-loader.js',
  'src\styles\uix-soft-premium-system.css',
  'src\index.css',
  'src\App.tsx',
  'src\pages\store\ProductDetailPage.tsx',
  'scripts\qa\smoke-post-ux-c-hotfix-13-1.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-12.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-11.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-10.ps1'
)
foreach ($file in $required) { if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" } }

$html = Get-Content 'index.html' -Raw
$loader = Get-Content 'public\brand-fonts-loader.js' -Raw
$uix = Get-Content 'src\styles\uix-soft-premium-system.css' -Raw
$indexCss = Get-Content 'src\index.css' -Raw
$app = Get-Content 'src\App.tsx' -Raw
$pdp = Get-Content 'src\pages\store\ProductDetailPage.tsx' -Raw

if ($html -match '(?i)onload\s*=') { Fail 'CSP-blocked inline event handlers removed from index.html' } else { Pass 'CSP-blocked inline event handlers removed from index.html' }
foreach ($needle in @('id="selfcare-brand-fonts"','media="print"','src="/brand-fonts-loader.js" defer','<noscript><link rel="stylesheet"')) {
  if ($html.Contains($needle)) { Pass "CSP-safe font HTML retained: $needle" } else { Fail "CSP-safe font HTML retained: $needle" }
}
foreach ($needle in @("document.getElementById('selfcare-brand-fonts')","link.addEventListener('load', activate, { once: true })","link.media = 'all'",'if (link.sheet)')) {
  if ($loader.Contains($needle)) { Pass "external font loader retained: $needle" } else { Fail "external font loader retained: $needle" }
}
if ($uix -match '(?im)^\s*@import\s+url\([^\r\n]*fonts\.googleapis\.com') { Fail 'blocking Google Fonts CSS import remains removed' } else { Pass 'blocking Google Fonts CSS import remains removed' }
if ($indexCss.Contains('Material+Symbols+Outlined')) { Fail 'HOTFIX 12 Material Symbols removal retained' } else { Pass 'HOTFIX 12 Material Symbols removal retained' }
if ($app.Contains('material-symbols-outlined')) { Fail 'HOTFIX 12 runtime Material Symbols removal retained' } else { Pass 'HOTFIX 12 runtime Material Symbols removal retained' }
foreach ($needle in @('window.__SELFCARE_EARLY_PRODUCT__','queryFn: consumeEarlyProduct','staleTime: 30_000','getResponsiveProductImage','srcSet={mainImage.srcSet}','sizes={mainImage.sizes}','fetchPriority="high" loading="eager" decoding="async"','LazyReviewList','LazyReviewForm')) {
  $source = if ($needle -eq 'window.__SELFCARE_EARLY_PRODUCT__') { $html } else { $pdp }
  if ($source.Contains($needle)) { Pass "protected PDP behavior retained: $needle" } else { Fail "protected PDP behavior retained: $needle" }
}
Pass 'POST-UX C HOTFIX 13.2 CSP-safe brand font activation checks'
