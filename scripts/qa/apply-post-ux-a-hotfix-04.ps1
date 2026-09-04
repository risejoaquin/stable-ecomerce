$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "scripts\qa\smoke-post-ux-a.ps1"
if (!(Test-Path $path)) {
  throw "Missing file: $path"
}

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

$alreadyApplied =
  $content.Contains('Get-Command npm.cmd') -and
  $content.Contains('& $npmCmd audit --audit-level=high')

if ($alreadyApplied) {
  Write-Host "SKIP already applied: explicit npm.cmd audit runner" -ForegroundColor Yellow
  Write-Host "PASS POST-UX A HOTFIX 04 applied" -ForegroundColor Green
  exit 0
}

$replacement = @'
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

$patterns = @(
  "(?ms)Write-Host\s+'Running npm audit HIGH/CRITICAL gate\.\.\.'\s*\r?\n\s*\$auditOutput\s*=\s*&\s*cmd\.exe[^\r\n]*\r?\n\s*\$auditExit\s*=\s*\$LASTEXITCODE",
  "(?ms)Write-Host\s+'Running npm audit HIGH/CRITICAL gate\.\.\.'\s*\r?\n\s*\$auditOutput\s*=\s*&\s*npm[^\r\n]*\r?\n\s*\$auditExit\s*=\s*\$LASTEXITCODE",
  '(?ms)Write-Host\s+"Running npm audit HIGH/CRITICAL gate\.\.\."\s*\r?\n\s*\$auditOutput\s*=\s*&\s*cmd\.exe[^\r\n]*\r?\n\s*\$auditExit\s*=\s*\$LASTEXITCODE',
  '(?ms)Write-Host\s+"Running npm audit HIGH/CRITICAL gate\.\.\."\s*\r?\n\s*\$auditOutput\s*=\s*&\s*npm[^\r\n]*\r?\n\s*\$auditExit\s*=\s*\$LASTEXITCODE'
)

$patched = $false
foreach ($pattern in $patterns) {
  $regex = [System.Text.RegularExpressions.Regex]::new($pattern)
  $updated = $regex.Replace($content, $replacement, 1)

  if ($updated -ne $content) {
    $content = $updated
    $patched = $true
    break
  }
}

if (-not $patched) {
  Write-Host "Detected audit-related lines:" -ForegroundColor Yellow
  $lines = $content -split "`r?`n"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'audit|cmd\.exe|npm') {
      Write-Host ("{0}: {1}" -f ($i + 1), $lines[$i])
    }
  }
  throw "Patch anchor not found in smoke-post-ux-a.ps1 even with tolerant matcher"
}

[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

Write-Host "PATCH POST-UX A smoke uses explicit npm.cmd (tolerant matcher)" -ForegroundColor Green
Write-Host "PASS POST-UX A HOTFIX 04 applied" -ForegroundColor Green
