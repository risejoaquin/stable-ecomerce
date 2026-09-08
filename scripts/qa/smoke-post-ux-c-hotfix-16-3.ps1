$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$server = Get-Content 'server.ts' -Raw
$html = Get-Content 'index.html' -Raw

foreach ($needle in @(
  'POST-UX C HOTFIX 16.3: inject bootstrap before the client bootstrap executes.',
  "html.replace('</head>', bootstrap + '  </head>')",
  'selfcare-server-product-bootstrap',
  'serializePdpBootstrap'
)) {
  if ($server.Contains($needle)) { Pass "server ordering contract: $needle" } else { Fail "server ordering contract: $needle" }
}

if ($server.Contains("html.replace('</body>', bootstrap + '  </body>')")) {
  Fail 'obsolete body-end product bootstrap injection removed'
} else {
  Pass 'obsolete body-end product bootstrap injection removed'
}

foreach ($needle in @(
  "document.getElementById('selfcare-server-product-bootstrap')",
  'Promise.resolve(serverProduct)',
  'window.__SELFCARE_EARLY_PRODUCT__'
)) {
  if ($html.Contains($needle)) { Pass "client bootstrap contract: $needle" } else { Fail "client bootstrap contract: $needle" }
}

& ".\scripts\qa\smoke-post-ux-c-hotfix-16.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 16 regression' }
Pass 'HOTFIX 16 regression'

& ".\scripts\qa\smoke-post-ux-c-hotfix-16-1.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 16.1 regression' }
Pass 'HOTFIX 16.1 regression'

& ".\scripts\qa\smoke-post-ux-c-hotfix-16-2.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'HOTFIX 16.2 regression' }
Pass 'HOTFIX 16.2 regression'

Pass 'POST-UX C HOTFIX 16.3 bootstrap ordering repair checks'
