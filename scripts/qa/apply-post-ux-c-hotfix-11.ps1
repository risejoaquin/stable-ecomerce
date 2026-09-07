$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

Write-Host "Applying POST-UX C HOTFIX 11 - PDP Early Product Discovery / Critical Data Path" -ForegroundColor Cyan

$node = Get-Command node -ErrorAction Stop
& $node.Source ".\scripts\qa\patch-post-ux-c-hotfix-11.mjs"

if ($LASTEXITCODE -ne 0) {
  throw "HOTFIX 11 patcher failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "HOTFIX 11 applied." -ForegroundColor Green
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "  .\scripts\qa\smoke-post-ux-c-hotfix-11.ps1"
Write-Host "  npm run build"
