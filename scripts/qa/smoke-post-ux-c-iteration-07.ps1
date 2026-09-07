$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "scripts\qa\analyze-post-ux-c-unused-js.ps1"
if (!(Test-Path $path)) { Fail "unused JS analyzer exists" }
Pass "unused JS analyzer exists"

$content = Get-Content $path -Raw

foreach ($check in @(
  @("unused-javascript", "Lighthouse unused-javascript audit configured"),
  @("wastedBytes", "wasted bytes extraction configured"),
  @("totalBytes", "total bytes extraction configured"),
  @("wastedPercent", "wasted percentage calculation configured"),
  @("AGGREGATED BY SCRIPT URL", "script URL aggregation configured"),
  @("post-ux-c-unused-js-detail.csv", "CSV output configured")
)) {
  if ($content.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

Pass "POST-UX C Iteration 07 - exact unused JavaScript attribution checks"
