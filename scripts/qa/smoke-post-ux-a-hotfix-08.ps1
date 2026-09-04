$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "scripts\qa\smoke-post-ux-a-hotfix-07.ps1"
if (!(Test-Path $path)) { Fail "HOTFIX 07 smoke exists" }
Pass "HOTFIX 07 smoke exists"

$source = Get-Content -Raw -LiteralPath $path

foreach ($check in @(
  @("ConvertFrom-Json", "semantic JSON parser configured"),
  @('$pkg.dependencies.($check.Name)', "direct dependency semantic lookup configured"),
  @('$pkg.overrides.($check.Name)', "override semantic lookup configured"),
  @("POST-UX A HOTFIX 07 semantic source checks", "semantic completion marker configured")
)) {
  if ($source.Contains($check[0])) {
    Pass $check[1]
  } else {
    Fail $check[1]
  }
}

if ($source.Contains('$package.Contains(')) {
  Fail "legacy textual package.json validation remains"
} else {
  Pass "legacy textual package.json validation removed"
}

Pass "POST-UX A HOTFIX 08 smoke repair checks"
