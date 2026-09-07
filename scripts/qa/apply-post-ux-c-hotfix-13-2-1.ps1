$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
Write-Host "Applying POST-UX C HOTFIX 13.2.1 - Repair inherited HOTFIX 13.1 QA contract" -ForegroundColor Cyan
$node = Get-Command node -ErrorAction Stop
& $node.Source ".\scripts\qa\patch-post-ux-c-hotfix-13-2-1.mjs"
if ($LASTEXITCODE -ne 0) { throw "HOTFIX 13.2.1 patcher failed with exit code $LASTEXITCODE" }
Write-Host ""
Write-Host "PASS POST-UX C HOTFIX 13.2.1 applied" -ForegroundColor Green
Write-Host "Next:"
Write-Host "  .\scripts\qa\smoke-post-ux-c-hotfix-13-2-1.ps1"
