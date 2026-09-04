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

$required = @(
  @("Get-Command npm.cmd", "npm.cmd command resolution configured"),
  @("nodejs\npm.cmd", "Program Files npm.cmd fallback configured"),
  @('& $npmCmd audit --audit-level=high', "explicit npm.cmd audit execution configured"),
  @("NPM_CMD=", "resolved npm path diagnostic configured")
)

foreach ($item in $required) {
  if ($source.Contains($item[0])) {
    Pass $item[1]
  } else {
    Fail $item[1]
  }
}

if ($source -match '&\s*cmd\.exe[^\r\n]*npm audit') {
  Fail "legacy cmd.exe npm audit runner remains"
} else {
  Pass "legacy cmd.exe npm audit runner removed"
}

if ($source -match '&\s*npm\s+audit') {
  Fail "generic npm audit runner remains"
} else {
  Pass "generic npm audit runner removed"
}

Pass "POST-UX A HOTFIX 05 harness checks"
