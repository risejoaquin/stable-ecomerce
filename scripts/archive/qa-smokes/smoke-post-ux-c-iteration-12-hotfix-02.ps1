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

foreach ($needle in @(
  "/aria-hidden/",
  "/react-remove-scroll/",
  "/react-remove-scroll-bar/",
  "/react-style-singleton/",
  "/use-callback-ref/",
  "/use-sidecar/"
)) {
  if ($source.Contains($needle)) { Pass "Radix UI transitive isolated: $needle" }
  else { Fail "Radix UI transitive dependency missing: $needle" }
}

if ($source.Contains("return 'vendor-ui'")) { Pass "vendor-ui chunk rule exists" }
else { Fail "vendor-ui chunk rule missing" }

foreach ($protected in @(
  "/react/",
  "/react-dom/",
  "/react-router/",
  "/react-router-dom/",
  "/lucide-react/"
)) {
  if ($source.Contains($protected)) { Pass "Protected vendor core retained: $protected" }
  else { Fail "Protected vendor core missing: $protected" }
}

if ($source.Contains("return 'vendor-charts'")) { Pass "vendor-charts retained" }
else { Fail "vendor-charts missing" }

Pass "POST-UX C ITERATION 12 HOTFIX 02 structural checks"
