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
  "/aria-hidden/",
  "/react-remove-scroll/",
  "/react-remove-scroll-bar/",
  "/react-style-singleton/",
  "/use-callback-ref/",
  "/use-sidecar/"
)) {
  if ($source.Contains($dep)) {
    Pass "Radix UI transitive dependency grouped: $dep"
  } else {
    Fail "Radix UI transitive dependency missing: $dep"
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

if ($source.Contains("return 'vendor-ui';")) {
  Pass "vendor-ui return retained"
} else {
  Fail "vendor-ui return missing"
}

if ($source.Contains("return 'vendor';")) {
  Pass "stable vendor fallback retained"
} else {
  Fail "stable vendor fallback missing"
}

Pass "POST-UX C Iteration 12 - Radix UI dependency isolation checks"
