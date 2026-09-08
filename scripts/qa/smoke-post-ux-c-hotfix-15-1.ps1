$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$server = Get-Content 'server.ts' -Raw
$html = Get-Content 'index.html' -Raw

foreach ($needle in @(
  'POST-UX C HOTFIX 15.1: cache PDP LCP image lookup',
  'pdpLcpImageCache',
  'PDP_LCP_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpLcpImageUrl',
  'data-selfcare-server-pdp-lcp-preload'
)) {
  if ($server.Contains($needle)) { Pass $needle } else { Fail $needle }
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
