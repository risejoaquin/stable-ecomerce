$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "scripts\qa\smoke-post-ux-a-hotfix-07.ps1"
if (!(Test-Path $path)) {
  throw "Missing file: $path"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$full = (Resolve-Path $path).Path

$new = @'
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

if (!(Test-Path "package.json")) {
  Fail "package.json exists"
}
Pass "package.json exists"

try {
  $pkg = Get-Content -Raw -LiteralPath "package.json" | ConvertFrom-Json
} catch {
  Fail "package.json parses as JSON"
}
Pass "package.json parses as JSON"

$directChecks = @(
  @{ Name = "dompurify"; Expected = "^3.4.14"; Label = "DOMPurify direct security floor" },
  @{ Name = "react-router-dom"; Expected = "^7.18.2"; Label = "React Router DOM direct security floor" }
)

foreach ($check in $directChecks) {
  $actual = $pkg.dependencies.($check.Name)
  if ($actual -eq $check.Expected) {
    Pass $check.Label
  } else {
    Fail "$($check.Label) - expected $($check.Expected), found $actual"
  }
}

$overrideChecks = @(
  @{ Name = "brace-expansion"; Expected = "5.0.9" },
  @{ Name = "browserslist"; Expected = "4.28.8" },
  @{ Name = "ip-address"; Expected = "10.5.0" },
  @{ Name = "nanoid"; Expected = "3.3.18" },
  @{ Name = "postcss"; Expected = "8.5.28" },
  @{ Name = "qs"; Expected = "6.16.0" },
  @{ Name = "react-router"; Expected = "7.18.2" },
  @{ Name = "undici"; Expected = "7.29.0" }
)

foreach ($check in $overrideChecks) {
  $actual = $pkg.overrides.($check.Name)
  if ($actual -eq $check.Expected) {
    Pass "$($check.Name) override"
  } else {
    Fail "$($check.Name) override - expected $($check.Expected), found $actual"
  }
}

$repairPath = "scripts\qa\repair-post-ux-a-hotfix-07.ps1"
if (!(Test-Path $repairPath)) {
  Fail "HOTFIX 07 repair script exists"
}
Pass "HOTFIX 07 repair script exists"

$repair = Get-Content -Raw -LiteralPath $repairPath

if ($repair.Contains("npm.cmd")) {
  Pass "explicit npm.cmd repair runner"
} else {
  Fail "explicit npm.cmd repair runner"
}

if ($repair.Contains("audit --audit-level=high")) {
  Pass "HIGH/CRITICAL gate retained"
} else {
  Fail "HIGH/CRITICAL gate retained"
}

Pass "POST-UX A HOTFIX 07 semantic source checks"
'@

[System.IO.File]::WriteAllText($full, $new, $utf8NoBom)

Write-Host "PATCH HOTFIX 07 smoke now validates semantic JSON values" -ForegroundColor Green
Write-Host "PASS POST-UX A HOTFIX 08 applied" -ForegroundColor Green
