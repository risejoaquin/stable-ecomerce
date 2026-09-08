$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$required = @(
  'server.ts',
  'index.html',
  'src\pages\store\ProductDetailPage.tsx',
  'src\lib\product-image.ts',
  'scripts\qa\smoke-post-ux-c-hotfix-14-2.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-13-2-1.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-12.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-11.ps1',
  'scripts\qa\smoke-post-ux-c-hotfix-10.ps1'
)

foreach ($file in $required) {
  if (Test-Path $file) { Pass "required file exists: $file" } else { Fail "required file exists: $file" }
}

$server = Get-Content 'server.ts' -Raw
$html = Get-Content 'index.html' -Raw
$pdp = Get-Content 'src\pages\store\ProductDetailPage.tsx' -Raw

# POST-UX C HOTFIX 16.2: HOTFIX 15 successor-aware QA contract
if ($server.Contains(".select('images')") -or $server.Contains(".select('*')")) {
  Pass "server-assisted PDP preload product lookup retained via images-only or full-product successor"
} else {
  Fail "server-assisted PDP preload product lookup retained via images-only or full-product successor"
}

foreach ($needle in @(
  'POST-UX C HOTFIX 15: server-assisted PDP LCP image preload',
  'data-selfcare-server-pdp-lcp-preload',
  'imagesrcset=',
  'imagesizes="(max-width: 768px) 100vw, 50vw"',
  'fetchpriority="high"',
  "html.replace('</head>'",
  "res.type('html').send(html)"
)) {
  if ($server.Contains($needle)) { Pass "server-assisted PDP preload retained: $needle" } else { Fail "server-assisted PDP preload retained: $needle" }
}

if ($server.IndexOf('server-assisted PDP LCP image preload') -lt $server.IndexOf("app.get('*', (req, res) =>")) {
  Pass 'PDP preload route remains before generic SPA fallback'
} else {
  Fail 'PDP preload route remains before generic SPA fallback'
}

foreach ($needle in @(
  "app.use(express.static(distPath))",
  "app.get('*', (req, res) =>",
  "res.sendFile(path.join(distPath, 'index.html'))"
)) {
  if ($server.Contains($needle)) { Pass "production static fallback retained: $needle" } else { Fail "production static fallback retained: $needle" }
}

foreach ($needle in @(
  'data-selfcare-pdp-lcp-preload',
  'window.__SELFCARE_EARLY_PRODUCT__',
  "preload.fetchPriority = 'high'"
)) {
  if ($html.Contains($needle)) { Pass "HOTFIX 14.2/11 client fallback retained: $needle" } else { Fail "HOTFIX 14.2/11 client fallback retained: $needle" }
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

Pass 'POST-UX C HOTFIX 15 server-assisted PDP LCP preload checks'
