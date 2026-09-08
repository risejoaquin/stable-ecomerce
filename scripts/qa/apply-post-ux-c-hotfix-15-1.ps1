$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
Write-Host "Applying POST-UX C HOTFIX 15.1 - Cached server-assisted PDP LCP preload" -ForegroundColor Cyan
& node ".\scripts\qa\patch-post-ux-c-hotfix-15-1.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 15.1 patcher failed with exit code $LASTEXITCODE" }
Write-Host "PASS POST-UX C HOTFIX 15.1 applied" -ForegroundColor Green
