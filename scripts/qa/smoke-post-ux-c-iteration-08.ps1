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

if ($source.Contains("if (normalizedId.includes('/src/pages/store/')) return 'storefront-pages';")) {
  Fail "forced storefront-pages manual chunk still configured"
} else {
  Pass "forced storefront-pages manual chunk removed"
}

if ($source.Contains("Storefront route modules intentionally keep their natural Vite/Rollup")) {
  Pass "natural storefront lazy-route boundary marker exists"
} else {
  Fail "natural storefront lazy-route boundary marker missing"
}

foreach ($guard in @(
  "/react/",
  "/react-dom/",
  "/react-router/",
  "/react-router-dom/",
  "/lucide-react/"
)) {
  if ($source.Contains($guard)) {
    Pass "stable vendor guard retained: $guard"
  } else {
    Fail "stable vendor guard missing: $guard"
  }
}

if ($source.Contains("return 'vendor';")) {
  Pass "stable vendor return retained"
} else {
  Fail "stable vendor return missing"
}

if ($source.Contains("return 'vendor-query';")) { Pass "vendor-query split retained" } else { Fail "vendor-query split missing" }
if ($source.Contains("return 'vendor-charts';")) { Pass "vendor-charts split retained" } else { Fail "vendor-charts split missing" }
if ($source.Contains("return 'vendor-ui';")) { Pass "vendor-ui split retained" } else { Fail "vendor-ui split missing" }

Pass "POST-UX C Iteration 08 - storefront route chunk boundary checks"
