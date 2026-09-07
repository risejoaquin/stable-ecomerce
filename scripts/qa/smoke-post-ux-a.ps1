$ErrorActionPreference = 'Stop'

function Assert-Contains([string]$Path, [string]$Needle, [string]$Label) {
  if (-not (Test-Path $Path)) { throw "FAIL $Label - missing $Path" }
  $text = Get-Content -Raw -LiteralPath $Path
  if ($text -notlike "*$Needle*") { throw "FAIL $Label - '$Needle' not found in $Path" }
  Write-Host "PASS $Label"
}

Assert-Contains 'package.json' '"brace-expansion": "5.0.9"' 'brace expansion patched override exists'
Assert-Contains 'package.json' '"browserslist": "4.28.8"' 'browserslist patched override exists'
Assert-Contains 'package.json' '"ip-address": "10.5.0"' 'ip address patched override exists'
Assert-Contains 'package.json' '"nanoid": "3.3.18"' 'nanoid patched override exists'
Assert-Contains 'package.json' '"postcss": "8.5.28"' 'postcss patched override exists'
Assert-Contains 'package.json' '"qs": "6.16.0"' 'qs patched override exists'
Assert-Contains 'package.json' '"react-router": "7.18.2"' 'react router patched override exists'
Assert-Contains 'package.json' '"undici": "7.29.0"' 'undici patched override exists'
Assert-Contains 'package.json' '"dompurify": "^3.4.14"' 'DOMPurify direct patch exists'
Assert-Contains 'package.json' '"react-router-dom": "^7.18.2"' 'react router DOM direct patch exists'
Assert-Contains 'docs/security/POST_UX_A_HOTFIX_02_TARGETED_HIGH_VULNERABILITY_PATCHES.md' 'HOTFIX 02' 'POST UX A hotfix 02 report exists'
Assert-Contains 'server.ts' 'fieldNestingDepth: 2' 'multer nesting limit exists'
Assert-Contains 'server.ts' 'files: 1' 'multer file count limit exists'
Assert-Contains 'server.ts' 'fields: 8' 'multer field count limit exists'
Assert-Contains 'server.ts' 'parts: 10' 'multer parts limit exists'
Assert-Contains 'server.ts' "'image/jpeg', 'image/png', 'image/webp'" 'upload MIME allow-list protected'
Assert-Contains 'docs/security/POST_UX_A_DEPENDENCY_SECURITY_HARDENING.md' 'POST-UX A' 'POST UX A report exists'

$lockText = Get-Content -Raw -LiteralPath 'package-lock.json'
if ($lockText -notmatch '"node_modules/brace-expansion"\s*:\s*\{[^}]*"version"\s*:\s*"5\.0\.9"') {
  throw 'FAIL dependency lock refresh - package-lock.json must resolve brace-expansion 5.0.9'
}
Write-Host 'PASS dependency lock refresh'

Write-Host 'Running npm audit HIGH/CRITICAL gate...'
$auditOutput = & cmd.exe /d /s /c 'npm audit --audit-level=high' 2>&1
$auditExit = $LASTEXITCODE
$auditOutput | ForEach-Object { Write-Host $_ }
if ($auditExit -ne 0) {
  Write-Host ''
  Write-Host 'POST-UX A remains OPEN because HIGH/CRITICAL vulnerabilities are still reported.' -ForegroundColor Yellow
  Write-Host 'Run this command and send the complete output for the next targeted hotfix:' -ForegroundColor Yellow
  Write-Host 'npm audit' -ForegroundColor Cyan
  throw 'FAIL npm audit HIGH/CRITICAL gate - review the audit output; do not run npm audit fix blindly'
}
Write-Host 'PASS npm audit HIGH/CRITICAL gate'
Write-Host 'PASS POST-UX A - dependency security hardening checks'
