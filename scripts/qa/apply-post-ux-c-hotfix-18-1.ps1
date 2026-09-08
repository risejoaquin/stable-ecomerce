$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 18.1 - Restore stable Lucide vendor graph" -ForegroundColor Cyan
& node ".\scripts\qa\patch-post-ux-c-hotfix-18-1.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 18.1 patcher failed with exit code $LASTEXITCODE" }
Write-Host "PASS POST-UX C HOTFIX 18.1 applied" -ForegroundColor Green
