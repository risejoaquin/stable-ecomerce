param(
  [string]$BaseUrl = "https://selfcaresinners.com"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail($message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }
function Assert-File($path, $message) { if (Test-Path $path) { Pass $message } else { Fail "$message ($path)" } }
function Assert-Contains($path, $pattern, $message) {
  if (!(Test-Path $path)) { Fail "$message ($path missing)" }
  $content = Get-Content $path -Raw
  if ($content -match $pattern) { Pass $message } else { Fail "$message ($path missing pattern: $pattern)" }
}

Assert-File "config\performance-budgets.json" "performance budgets exist"
Assert-File "scripts\qa\measure-post-ux-c-local.ps1" "local Lighthouse fallback exists"
Assert-File "docs\performance\POST_UX_C_HOTFIX_04_NPM_CMD_WINDOWS_SHIM.md" "POST UX C hotfix 04 report exists"

Assert-Contains "scripts\qa\measure-post-ux-c-local.ps1" "Get-Command npm\.cmd" "npm.cmd resolution configured"
Assert-Contains "scripts\qa\measure-post-ux-c-local.ps1" "nodejs\\npm\.cmd" "npm.cmd Windows fallback configured"
Assert-Contains "scripts\qa\measure-post-ux-c-local.ps1" "--package=lighthouse" "explicit Lighthouse package configured"
Assert-Contains "scripts\qa\measure-post-ux-c-local.ps1" "NPM_CMD_EXECUTION_FAILURE" "npm.cmd failure classification configured"
Assert-Contains "scripts\qa\measure-post-ux-c-local.ps1" "CHROME_LAUNCH_FAILURE" "Chrome failure classification configured"

try {
  $response = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 20
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) { Pass "production home responds" }
  else { Fail "production home returned $($response.StatusCode)" }
} catch {
  Fail "production home request failed: $($_.Exception.Message)"
}

Pass "POST-UX C - Windows npm.cmd Lighthouse runner checks"
