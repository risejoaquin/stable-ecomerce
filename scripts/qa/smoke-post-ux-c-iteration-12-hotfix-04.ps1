$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "scripts\qa\smoke-qa-release-e.ps1"
if (!(Test-Path $path)) { Fail "QA RELEASE E smoke exists" }
Pass "QA RELEASE E smoke exists"

$source = Get-Content -Raw -LiteralPath $path

if ($source.Contains("Vite blank screen regression note missing")) {
  Fail "stale comment-string regression assertion remains"
} else {
  Pass "stale comment-string regression assertion removed"
}

foreach ($needle in @(
  '$stableVendorGuards = @(',
  '"/react/"',
  '"/react-dom/"',
  '"/react-router/"',
  '"/react-router-dom/"',
  '"/lucide-react/"',
  'Vite stable vendor return protected'
)) {
  if ($source.Contains($needle)) {
    Pass "structural stable-vendor assertion present: $needle"
  } else {
    Fail "structural stable-vendor assertion missing: $needle"
  }
}

Pass "POST-UX C ITERATION 12 HOTFIX 04 QA harness checks"
