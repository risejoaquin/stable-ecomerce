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

$required = @(
  "/aria-hidden/",
  "/react-remove-scroll/",
  "/react-remove-scroll-bar/",
  "/react-style-singleton/",
  "/use-callback-ref/",
  "/use-sidecar/"
)

foreach ($needle in $required) {
  if ($source.Contains($needle)) {
    Pass "Radix UI transitive dependency isolated: $needle"
  } else {
    Fail "Radix UI transitive dependency missing: $needle"
  }
}

foreach ($protected in @(
  "/react/",
  "/react-dom/",
  "/react-router/",
  "/react-router-dom/",
  "/lucide-react/"
)) {
  if ($source.Contains($protected)) {
    Pass "Protected vendor core retained: $protected"
  } else {
    Fail "Protected vendor core missing: $protected"
  }
}

if ($source.Contains("return 'vendor-ui';")) {
  Pass "vendor-ui chunk retained"
} else {
  Fail "vendor-ui chunk missing"
}

if ($source.Contains("return 'vendor-charts';")) {
  Pass "vendor-charts chunk retained"
} else {
  Fail "vendor-charts chunk missing"
}

Pass "POST-UX C ITERATION 12 HOTFIX 01 structural checks"
