$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$server = Get-Content 'server.ts' -Raw
$html = Get-Content 'index.html' -Raw

# POST-UX C HOTFIX 16.2: HOTFIX 15.1 successor-aware QA contract
$legacyCache = @(
  'POST-UX C HOTFIX 15.1: cache PDP LCP image lookup',
  'pdpLcpImageCache',
  'PDP_LCP_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpLcpImageUrl'
)

$successorCache = @(
  'POST-UX C HOTFIX 16: server bootstrap full PDP product',
  'pdpProductCache',
  'PDP_PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpProduct'
)

$legacyPass = ($legacyCache | Where-Object { -not $server.Contains($_) }).Count -eq 0
$successorPass = ($successorCache | Where-Object { -not $server.Contains($_) }).Count -eq 0

if ($legacyPass -or $successorPass) {
  Pass 'HOTFIX 15.1 cache intent retained via legacy image cache or HOTFIX 16 product cache successor'
} else {
  Fail 'HOTFIX 15.1 cache intent retained via legacy image cache or HOTFIX 16 product cache successor'
}

if ($server.Contains('data-selfcare-server-pdp-lcp-preload')) {
  Pass 'data-selfcare-server-pdp-lcp-preload'
} else {
  Fail 'data-selfcare-server-pdp-lcp-preload'
}

foreach ($needle in @(
  'data-selfcare-pdp-lcp-preload',
  'data-selfcare-server-pdp-lcp-preload',
  "link[data-selfcare-server-pdp-lcp-preload], link[data-selfcare-pdp-lcp-preload]"
)) {
  if ($html.Contains($needle)) { Pass $needle } else { Fail $needle }
}

& ".\scripts\qa\smoke-post-ux-c-hotfix-15.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 15 regression' }

Pass 'POST-UX C HOTFIX 15.1 cached server-assisted PDP LCP preload checks'
