$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 20 - Deferred below-fold PDP DOM" -ForegroundColor Cyan
& node ".\scripts\qa\patch-post-ux-c-hotfix-20.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 20 patcher failed with exit code $LASTEXITCODE" }
Write-Host "PASS POST-UX C HOTFIX 20 applied" -ForegroundColor Green
