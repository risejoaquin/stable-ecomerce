$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "scripts\qa\analyze-post-ux-c-lcp.ps1"
if (!(Test-Path $path)) { Fail "LCP analysis script exists" }
Pass "LCP analysis script exists"

$content = Get-Content $path -Raw
foreach ($check in @(
  @("largest-contentful-paint-element", "LCP element inspection configured"),
  @("network-requests", "network request inspection configured"),
  @("largestImageKB", "largest image sizing configured"),
  @("slowestImageUrl", "slowest image detection configured"),
  @("server-response-time", "server response opportunity configured"),
  @("uses-responsive-images", "responsive image opportunity configured"),
  @("uses-optimized-images", "optimized image opportunity configured"),
  @("modern-image-formats", "modern image format opportunity configured"),
  @("unused-javascript", "unused JavaScript opportunity configured")
)) {
  if ($content.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

Pass "POST-UX C Iteration 04 - evidence-driven LCP analysis checks"
