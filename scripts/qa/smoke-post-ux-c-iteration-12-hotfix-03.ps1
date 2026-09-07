$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$source = Get-Content -Raw -LiteralPath "vite.config.ts"

$required = @(
  @("selfcare-stable-compression", "stable built-in compression plugin restored"),
  @("stableCompressionPlugin()", "stable compression plugin enabled"),
  @("/aria-hidden/", "aria-hidden isolated"),
  @("/react-remove-scroll/", "react-remove-scroll isolated"),
  @("/react-remove-scroll-bar/", "react-remove-scroll-bar isolated"),
  @("/react-style-singleton/", "react-style-singleton isolated"),
  @("/use-callback-ref/", "use-callback-ref isolated"),
  @("/use-sidecar/", "use-sidecar isolated"),
  @("return 'vendor-ui'", "vendor-ui retained"),
  @("return 'vendor-charts'", "vendor-charts retained"),
  @("/react-router-dom/", "protected React Router retained"),
  @("/lucide-react/", "protected lucide retained")
)

foreach ($check in $required) {
  if ($source.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

if ($source.Contains("vite-plugin-compression")) {
  Fail "legacy vite-plugin-compression runtime import remains"
} else {
  Pass "legacy vite-plugin-compression runtime import absent"
}

if ($source.Contains("return 'admin-pages'")) {
  Fail "forced admin-pages chunk returned"
} else {
  Pass "admin routes keep natural boundaries"
}

if ($source.Contains("return 'storefront-pages'")) {
  Fail "forced storefront-pages chunk returned"
} else {
  Pass "storefront routes keep natural boundaries"
}

Pass "POST-UX C ITERATION 12 HOTFIX 03 canonical Vite checks"
