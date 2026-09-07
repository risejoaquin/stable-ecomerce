$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$target = "scripts\qa\smoke-qa-release-e.ps1"
$canonical = Join-Path $PSScriptRoot "smoke-qa-release-e.post-ux-c-iteration-12-hotfix-04.ps1"

if (!(Test-Path $target)) { throw "Missing $target" }
if (!(Test-Path $canonical)) { throw "Missing canonical QA RELEASE E smoke payload" }

$backupDir = ".tmp\post-ux-c-iteration-12-hotfix-04"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item $target (Join-Path $backupDir "smoke-qa-release-e.before-hotfix-04.ps1") -Force
Copy-Item $canonical $target -Force

Write-Host "PATCH QA RELEASE E smoke synced to structural stable-vendor contract" -ForegroundColor Green
Write-Host "BACKUP $backupDir\smoke-qa-release-e.before-hotfix-04.ps1" -ForegroundColor Yellow
Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 04 applied" -ForegroundColor Green
