$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 20.2 - QA contract repair" -ForegroundColor Cyan
& node ".\scripts\qa\patch-post-ux-c-hotfix-20-2.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 20.2 patcher failed with exit code $LASTEXITCODE" }
Write-Host "PASS POST-UX C HOTFIX 20.2 applied" -ForegroundColor Green
