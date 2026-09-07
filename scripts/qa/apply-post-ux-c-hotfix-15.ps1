$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
Write-Host "Applying POST-UX C HOTFIX 15 - Server-assisted PDP LCP preload" -ForegroundColor Cyan
$node = Get-Command node -ErrorAction Stop
& $node.Source ".\scripts\qa\patch-post-ux-c-hotfix-15.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 15 patcher failed with exit code $LASTEXITCODE" }
Write-Host ""
Write-Host "PASS POST-UX C HOTFIX 15 applied" -ForegroundColor Green
Write-Host "Next:"
Write-Host "  .\scripts\qa\smoke-post-ux-c-hotfix-15.ps1"
Write-Host "  npm run build"
