$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 14.2 - Safe early PDP LCP preload repair" -ForegroundColor Cyan
$node = Get-Command node -ErrorAction Stop
& $node.Source ".\scripts\qa\patch-post-ux-c-hotfix-14-2.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 14.2 patcher failed with exit code $LASTEXITCODE" }

Write-Host ""
Write-Host "PASS POST-UX C HOTFIX 14.2 applied" -ForegroundColor Green
Write-Host "Next:"
Write-Host "  .\scripts\qa\smoke-post-ux-c-hotfix-14-2.ps1"
Write-Host "  npm run build"
