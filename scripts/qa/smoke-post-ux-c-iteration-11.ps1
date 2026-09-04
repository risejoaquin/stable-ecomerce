$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "vite.config.ts"
if (!(Test-Path $path)) { Fail "Vite config exists" }
Pass "Vite config exists"

$source = [System.IO.File]::ReadAllText(
  (Resolve-Path $path).Path,
  [System.Text.Encoding]::UTF8
)

foreach ($dep in @(
  "/@reduxjs/toolkit/",
  "/decimal.js-light/",
  "/es-toolkit/",
  "/eventemitter3/",
  "/immer/",
  "/react-redux/",
  "/redux/",
  "/redux-thunk/",
  "/reselect/",
  "/use-sync-external-store/"
)) {
  if ($source.Contains($dep)) {
    Pass "Recharts transitive dependency grouped: $dep"
  } else {
    Fail "Recharts transitive dependency missing: $dep"
  }
}

foreach ($guard in @(
  "/react/",
  "/react-dom/",
  "/react-router/",
  "/react-router-dom/",
  "/lucide-react/"
)) {
  if ($source.Contains($guard)) {
    Pass "stable protected vendor guard retained: $guard"
  } else {
    Fail "stable protected vendor guard missing: $guard"
  }
}

if ($source.Contains("return 'vendor-charts';")) {
  Pass "vendor-charts return retained"
} else {
  Fail "vendor-charts return missing"
}

if ($source.Contains("return 'vendor';")) {
  Pass "stable vendor fallback retained"
} else {
  Fail "stable vendor fallback missing"
}

Pass "POST-UX C Iteration 11 - Recharts dependency isolation checks"
