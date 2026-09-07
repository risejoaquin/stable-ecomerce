$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "scripts\qa\smoke-post-ux-a.ps1"
if (!(Test-Path $path)) { throw "Missing file: $path" }

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$full = (Resolve-Path $path).Path
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

$old = @'
Write-Host 'Running npm audit HIGH/CRITICAL gate...'
$auditOutput = & cmd.exe /d /s /c 'npm audit --audit-level=high' 2>&1
$auditExit = $LASTEXITCODE
'@

$new = @'
Write-Host 'Running npm audit HIGH/CRITICAL gate...'

$npmCmd = $null

try {
  $resolvedNpm = Get-Command npm.cmd -ErrorAction Stop
  if ($resolvedNpm -and $resolvedNpm.Source) {
    $npmCmd = $resolvedNpm.Source
  }
} catch {
  # Continue to deterministic Program Files fallback.
}

if (-not $npmCmd) {
  $candidate = Join-Path $env:ProgramFiles 'nodejs\npm.cmd'
  if (Test-Path $candidate) {
    $npmCmd = $candidate
  }
}

if (-not $npmCmd) {
  throw 'FAIL npm audit HIGH/CRITICAL gate - npm.cmd could not be resolved'
}

Write-Host "NPM_CMD=$npmCmd"
$auditOutput = & $npmCmd audit --audit-level=high 2>&1
$auditExit = $LASTEXITCODE
'@

if ($content.Contains($new)) {
  Write-Host "SKIP already applied: explicit npm.cmd audit runner" -ForegroundColor Yellow
} elseif ($content.Contains($old)) {
  $content = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH POST-UX A smoke uses explicit npm.cmd" -ForegroundColor Green
} else {
  throw "Patch anchor not found in smoke-post-ux-a.ps1"
}

Write-Host "PASS POST-UX A HOTFIX 03 applied" -ForegroundColor Green
