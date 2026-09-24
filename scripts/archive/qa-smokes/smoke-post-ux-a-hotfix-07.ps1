$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail($m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$package = Get-Content -Raw -LiteralPath "package.json"

$checks = @(
  @('"dompurify": "^3.4.14"', "DOMPurify direct security floor"),
  @('"react-router-dom": "^7.18.2"', "React Router DOM direct security floor"),
  @('"brace-expansion": "5.0.9"', "brace-expansion override"),
  @('"browserslist": "4.28.8"', "browserslist override"),
  @('"ip-address": "10.5.0"', "ip-address override"),
  @('"nanoid": "3.3.18"', "nanoid override"),
  @('"postcss": "8.5.28"', "postcss override"),
  @('"qs": "6.16.0"', "qs override"),
  @('"react-router": "7.18.2"', "react-router override"),
  @('"undici": "7.29.0"', "undici override")
)

foreach ($check in $checks) {
  if ($package.Contains($check[0])) { Pass $check[1] } else { Fail $check[1] }
}

$repair = Get-Content -Raw -LiteralPath "scripts\qa\repair-post-ux-a-hotfix-07.ps1"
if ($repair.Contains("npm.cmd")) { Pass "explicit npm.cmd repair runner" } else { Fail "explicit npm.cmd repair runner" }
if ($repair.Contains("audit --audit-level=high")) { Pass "HIGH/CRITICAL gate retained" } else { Fail "HIGH/CRITICAL gate retained" }

Pass "POST-UX A HOTFIX 07 source checks"
