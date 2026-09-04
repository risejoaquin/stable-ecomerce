$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$targets = @(
  "src\pages\store\HomePage.tsx",
  "src\pages\store\ProductDetailPage.tsx"
)

foreach ($path in $targets) {
  if (!(Test-Path $path)) {
    Fail "source exists: $path"
  }

  Pass "source exists: $path"

  $text = [System.IO.File]::ReadAllText(
    (Resolve-Path $path).Path,
    [System.Text.Encoding]::UTF8
  )

  foreach ($codePoint in @(0x00C3, 0x00C2, 0x00E2)) {
    $marker = [string][char]$codePoint
    if ($text.Contains($marker)) {
      Fail ("possible mojibake marker U+{0:X4} found in {1}" -f $codePoint, $path)
    }
  }

  Pass "UTF-8 mojibake markers absent: $path"
}

$homeSource = [System.IO.File]::ReadAllText(
  (Resolve-Path "src\pages\store\HomePage.tsx").Path,
  [System.Text.Encoding]::UTF8
)

$productSource = [System.IO.File]::ReadAllText(
  (Resolve-Path "src\pages\store\ProductDetailPage.tsx").Path,
  [System.Text.Encoding]::UTF8
)

if ($productSource.Contains('fetchPriority="high" loading="eager" decoding="async"')) {
  Pass "product LCP optimization retained"
} else {
  Fail "product LCP optimization missing"
}

if ($productSource.Contains("secondaryContentReady")) {
  Pass "product secondary request deferral retained"
} else {
  Fail "product secondary request deferral missing"
}

if ($homeSource.Contains('fetchPriority="high" loading="eager" decoding="async"')) {
  Fail "home high-priority hero regression reintroduced"
} else {
  Pass "home hero rollback retained"
}

Pass "POST-UX C UTF-8 storefront integrity checks"
