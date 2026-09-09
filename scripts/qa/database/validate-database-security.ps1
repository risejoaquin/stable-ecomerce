param(
  [string]$DatabaseUrl = $env:DATABASE_URL
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $root
if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  Write-Host "DATABASE_URL is required. Set `$env:DATABASE_URL or pass -DatabaseUrl." -ForegroundColor Yellow
  exit 2
}
$env:DATABASE_URL = $DatabaseUrl
New-Item -ItemType Directory -Force -Path "artifacts\qa" | Out-Null
& node ".\scripts\qa\database\check-database-security.mjs" | Tee-Object -FilePath ".\artifacts\qa\database-security-report.json"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "PASS database security inventory captured (report mode)" -ForegroundColor Green
Write-Host "Report: artifacts\qa\database-security-report.json" -ForegroundColor DarkGray
exit 0
