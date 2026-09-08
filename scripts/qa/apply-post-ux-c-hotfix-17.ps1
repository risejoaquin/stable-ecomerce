$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 17 - Native SEO head management" -ForegroundColor Cyan
& node ".\scripts\qa\patch-post-ux-c-hotfix-17.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 17 patcher failed with exit code $LASTEXITCODE" }

Write-Host "PASS POST-UX C HOTFIX 17 applied" -ForegroundColor Green
