$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "scripts\qa\smoke-post-ux-a.ps1"
if (!(Test-Path $path)) { Fail "POST-UX A main smoke exists" }
Pass "POST-UX A main smoke exists"

$source = Get-Content -Raw -LiteralPath $path

foreach ($check in @(
  @("ConvertFrom-Json", "semantic JSON parser configured"),
  @('$pkg.dependencies.($check.Name)', "direct dependency semantic lookup configured"),
  @('$pkg.overrides.($check.Name)', "override semantic lookup configured"),
  @("POST UX A semantic package validation", "semantic package validation marker configured"),
  @("Get-Command npm.cmd", "explicit npm.cmd audit runner retained"),
  @('& $npmCmd audit --audit-level=high', "HIGH/CRITICAL audit gate retained")
)) {
  if ($source.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

if ($source.Contains("Assert-Contains 'package.json'")) {
  Fail "legacy textual package.json assertions remain"
} else {
  Pass "legacy textual package.json assertions removed"
}

Pass "POST-UX A HOTFIX 09 main smoke repair checks"
