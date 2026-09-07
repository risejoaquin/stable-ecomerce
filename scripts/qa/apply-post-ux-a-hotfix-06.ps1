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

if (
  $content.Contains('Get-Command npm.cmd') -and
  $content.Contains('& $npmCmd audit --audit-level=high')
) {
  Write-Host "SKIP already applied: explicit npm.cmd audit runner" -ForegroundColor Yellow
  Write-Host "PASS POST-UX A HOTFIX 06 applied" -ForegroundColor Green
  exit 0
}

$needle = '& npm audit --audit-level=high'

if (-not $content.Contains($needle)) {
  Write-Host "Detected audit-related lines:" -ForegroundColor Yellow
  $lines = $content -split "`r?`n"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'audit|cmd\.exe|npm') {
      Write-Host ("{0}: {1}" -f ($i + 1), $lines[$i])
    }
  }
  throw "Direct npm audit line not found in smoke-post-ux-a.ps1"
}

$replacement = @'
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
& $npmCmd audit --audit-level=high
'@

$content = $content.Replace($needle, $replacement)
[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

Write-Host "PATCH direct npm audit runner replaced with explicit npm.cmd" -ForegroundColor Green
Write-Host "PASS POST-UX A HOTFIX 06 applied" -ForegroundColor Green
