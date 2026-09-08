$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 16 - Server-bootstrapped PDP product" -ForegroundColor Cyan
& node ".\scripts\qa\patch-post-ux-c-hotfix-16.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 16 patcher failed with exit code $LASTEXITCODE" }
Write-Host "PASS POST-UX C HOTFIX 16 applied" -ForegroundColor Green
