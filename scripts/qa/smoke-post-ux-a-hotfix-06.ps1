$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$path = "scripts\qa\smoke-post-ux-a.ps1"
if (!(Test-Path $path)) { Fail "POST-UX A smoke exists" }
Pass "POST-UX A smoke exists"

$source = [System.IO.File]::ReadAllText(
  (Resolve-Path $path).Path,
  [System.Text.Encoding]::UTF8
)

foreach ($check in @(
  @("Get-Command npm.cmd", "npm.cmd command resolution configured"),
  @("nodejs\npm.cmd", "Program Files npm.cmd fallback configured"),
  @('& $npmCmd audit --audit-level=high', "explicit npm.cmd audit execution configured"),
  @("NPM_CMD=", "resolved npm path diagnostic configured")
)) {
  if ($source.Contains($check[0])) {
    Pass $check[1]
  } else {
    Fail $check[1]
  }
}

if ($source.Contains('& npm audit --audit-level=high')) {
  Fail "legacy direct npm audit runner remains"
} else {
  Pass "legacy direct npm audit runner removed"
}

Pass "POST-UX A HOTFIX 06 direct-runner checks"
