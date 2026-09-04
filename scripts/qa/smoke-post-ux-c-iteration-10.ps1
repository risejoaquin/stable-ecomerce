$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "scripts\qa\analyze-post-ux-c-vendor-modules.mjs"
if (!(Test-Path $path)) { Fail "vendor module analyzer exists" }
Pass "vendor module analyzer exists"

$content = Get-Content $path -Raw

foreach ($check in @(
  @("write: false", "non-writing Vite analysis configured"),
  @("vendorChunk.modules", "Rollup module metadata configured"),
  @("renderedLength", "rendered byte attribution configured"),
  @("packageNameFromId", "package attribution configured"),
  @("lucide-react", "protected lucide marker configured"),
  @("react-router-dom", "protected router marker configured"),
  @("post-ux-c-vendor-package-summary.csv", "CSV output configured")
)) {
  if ($content.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

Pass "POST-UX C Iteration 10 - protected vendor composition diagnostic checks"
