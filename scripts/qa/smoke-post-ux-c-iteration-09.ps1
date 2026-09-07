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

foreach ($forbidden in @(
  "return 'admin-pages';",
  "return 'email-admin';",
  "return 'storefront-pages';"
)) {
  if ($source.Contains($forbidden)) {
    Fail "manual route chunk remains: $forbidden"
  }
}
Pass "manual page/email route chunks removed"

foreach ($marker in @(
  "Admin route modules keep their natural lazy-route boundaries.",
  "Admin email modules keep natural Rollup dependency boundaries.",
  "Storefront route modules intentionally keep their natural Vite/Rollup"
)) {
  if ($source.Contains($marker)) {
    Pass "natural boundary marker retained"
  } else {
    Fail "natural boundary marker missing"
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
    Pass "stable vendor guard retained: $guard"
  } else {
    Fail "stable vendor guard missing: $guard"
  }
}

foreach ($split in @(
  "return 'vendor-query';",
  "return 'vendor-charts';",
  "return 'vendor-commerce';",
  "return 'vendor-observability';",
  "return 'vendor-ui';"
)) {
  if ($source.Contains($split)) {
    Pass "vendor split retained: $split"
  } else {
    Fail "vendor split missing: $split"
  }
}

Pass "POST-UX C Iteration 09 - natural admin dependency boundaries checks"
