param(
  [switch]$EnforceAudit
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $root

Write-Host "Checking dependency tree..." -ForegroundColor Cyan
& npm ls --all
$treeCode = $LASTEXITCODE
if ($treeCode -ne 0) {
  Write-Host "FAIL npm dependency tree is inconsistent" -ForegroundColor Red
  exit 1
}
Write-Host "PASS npm dependency tree" -ForegroundColor Green

Write-Host "Running production dependency advisory report..." -ForegroundColor Cyan
& npm audit --omit=dev --json | Set-Content -Encoding UTF8 "artifacts\qa\npm-audit-production.json"
$auditCode = $LASTEXITCODE
if ($auditCode -eq 0) {
  Write-Host "PASS production npm audit" -ForegroundColor Green
  exit 0
}

if ($EnforceAudit) {
  Write-Host "FAIL production npm audit reported vulnerabilities" -ForegroundColor Red
  exit $auditCode
}

Write-Host "REPORT npm audit reported advisories; saved to artifacts\qa\npm-audit-production.json" -ForegroundColor Yellow
Write-Host "Use -EnforceAudit only after AUDIT-03 classifies reachability/severity policy." -ForegroundColor DarkGray
exit 0
