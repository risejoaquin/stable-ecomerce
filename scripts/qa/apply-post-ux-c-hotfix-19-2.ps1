$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 19.2 - Toast vendor isolation" -ForegroundColor Cyan
& node ".\scripts\qa\patch-post-ux-c-hotfix-19-2.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 19.2 patcher failed with exit code $LASTEXITCODE" }
Write-Host "PASS POST-UX C HOTFIX 19.2 applied" -ForegroundColor Green
