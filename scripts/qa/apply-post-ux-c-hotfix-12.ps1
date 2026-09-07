$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 12 - Remove Material Symbols render-blocking font" -ForegroundColor Cyan

$node = Get-Command node -ErrorAction Stop
& $node.Source ".\scripts\qa\patch-post-ux-c-hotfix-12.mjs"

if ($LASTEXITCODE -ne 0) {
  throw "HOTFIX 12 patcher failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "PASS POST-UX C HOTFIX 12 applied" -ForegroundColor Green
Write-Host "Next:"
Write-Host "  .\scripts\qa\smoke-post-ux-c-hotfix-12.ps1"
Write-Host "  npm run build"
