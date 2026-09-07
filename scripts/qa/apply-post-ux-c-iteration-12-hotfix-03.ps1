$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "vite.config.ts"
if (!(Test-Path $path)) { throw "Missing vite.config.ts" }

$backupDir = ".tmp\post-ux-c-iteration-12-hotfix-03"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item $path (Join-Path $backupDir "vite.config.before-hotfix-03.ts") -Force

$canonicalPath = Join-Path $PSScriptRoot "vite.config.post-ux-c-iteration-12-hotfix-03.ts"
if (!(Test-Path $canonicalPath)) {
  throw "Missing canonical vite config payload"
}

Copy-Item $canonicalPath $path -Force

Write-Host "PATCH restored canonical POST-UX B / Iteration 09-11 Vite config + Iteration 12 vendor-ui isolation" -ForegroundColor Green
Write-Host "BACKUP $backupDir\vite.config.before-hotfix-03.ts" -ForegroundColor Yellow
Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 03 applied" -ForegroundColor Green
