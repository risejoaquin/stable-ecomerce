$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$server = Get-Content 'server.ts' -Raw
$html = Get-Content 'index.html' -Raw

$serverBootstrapMarker = 'id="selfcare-server-product-bootstrap"'
$clientBootstrapMarker = "document.getElementById('selfcare-server-product-bootstrap')"

if ($server.Contains("html.replace('</head>', bootstrap + '  </head>')")) {
  Pass 'server injects inert product bootstrap into head'
} else {
  Fail 'server injects inert product bootstrap into head'
}

if ($html.IndexOf($clientBootstrapMarker) -ge 0) {
  Pass 'client bootstrap consumer remains present'
} else {
  Fail 'client bootstrap consumer remains present'
}

foreach ($needle in @(
  'POST-UX C HOTFIX 16: server bootstrap full PDP product',
  'pdpProductCache',
  'PDP_PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpProduct',
  ".select('*')",
  'serializePdpBootstrap',
  'selfcare-server-product-bootstrap',
  'data-selfcare-server-pdp-lcp-preload'
)) {
  if ($server.Contains($needle)) { Pass "server contract: $needle" } else { Fail "server contract: $needle" }
}

foreach ($needle in @(
  "document.getElementById('selfcare-server-product-bootstrap')",
  'Promise.resolve(serverProduct)',
  '/api/products/',
  'window.__SELFCARE_EARLY_PRODUCT__',
  'data-selfcare-pdp-lcp-preload',
  'link[data-selfcare-server-pdp-lcp-preload], link[data-selfcare-pdp-lcp-preload]'
)) {
  if ($html.Contains($needle)) { Pass "client contract: $needle" } else { Fail "client contract: $needle" }
}

if ($server -match '<script[^>]*>.*JSON\.stringify') {
  Fail 'bootstrap must not be emitted as executable inline JavaScript'
} else {
  Pass 'bootstrap remains application/json data, not executable inline JavaScript'
}

Pass 'POST-UX C HOTFIX 16 server-bootstrapped PDP product checks'
