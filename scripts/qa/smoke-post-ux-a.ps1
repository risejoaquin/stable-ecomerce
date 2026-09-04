$ErrorActionPreference = 'Stop'

function Assert-Contains([string]$Path, [string]$Needle, [string]$Label) {
  if (-not (Test-Path $Path)) { throw "FAIL $Label - missing $Path" }
  $text = Get-Content -Raw -LiteralPath $Path
  if ($text -notlike "*$Needle*") { throw "FAIL $Label - '$Needle' not found in $Path" }
  Write-Host "PASS $Label"
}

if (!(Test-Path 'package.json')) {
  throw 'FAIL package.json exists'
}

try {
  $pkg = Get-Content -Raw -LiteralPath 'package.json' | ConvertFrom-Json
} catch {
  throw 'FAIL package.json parses as JSON'
}

Write-Host 'PASS package.json parses as JSON'

$directChecks = @(
  @{ Name = 'dompurify'; Expected = '^3.4.14'; Label = 'DOMPurify direct patch exists' },
  @{ Name = 'react-router-dom'; Expected = '^7.18.2'; Label = 'react router DOM direct patch exists' }
)

foreach ($check in $directChecks) {
  $actual = $pkg.dependencies.($check.Name)
  if ($actual -ne $check.Expected) {
    throw "FAIL $($check.Label) - expected $($check.Expected), found $actual"
  }
  Write-Host "PASS $($check.Label)"
}

$overrideChecks = @(
  @{ Name = 'brace-expansion'; Expected = '5.0.9'; Label = 'brace expansion patched override exists' },
  @{ Name = 'browserslist'; Expected = '4.28.8'; Label = 'browserslist patched override exists' },
  @{ Name = 'ip-address'; Expected = '10.5.0'; Label = 'ip address patched override exists' },
  @{ Name = 'nanoid'; Expected = '3.3.18'; Label = 'nanoid patched override exists' },
  @{ Name = 'postcss'; Expected = '8.5.28'; Label = 'postcss patched override exists' },
  @{ Name = 'qs'; Expected = '6.16.0'; Label = 'qs patched override exists' },
  @{ Name = 'react-router'; Expected = '7.18.2'; Label = 'react router patched override exists' },
  @{ Name = 'undici'; Expected = '7.29.0'; Label = 'undici patched override exists' }
)

foreach ($check in $overrideChecks) {
  $actual = $pkg.overrides.($check.Name)
  if ($actual -ne $check.Expected) {
    throw "FAIL $($check.Label) - expected $($check.Expected), found $actual"
  }
  Write-Host "PASS $($check.Label)"
}

Write-Host 'PASS POST UX A semantic package validation'
$lockText = Get-Content -Raw -LiteralPath 'package-lock.json'
if ($lockText -match 'node_modules/brace-expansion' -and $lockText -notmatch '"node_modules/brace-expansion"\s*:\s*\{[^}]*"version"\s*:\s*"5\.0\.9"') {
  throw 'FAIL dependency lock refresh - run npm install once to resolve brace-expansion 5.0.9 before closing POST-UX A'
}
Write-Host 'PASS dependency lock refresh'

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
& $npmCmd audit --audit-level=high
if ($LASTEXITCODE -ne 0) {
  throw 'FAIL npm audit HIGH/CRITICAL gate - review the audit output; do not run npm audit fix blindly'
}
Write-Host 'PASS npm audit HIGH/CRITICAL gate'
Write-Host 'PASS POST-UX A - dependency security hardening checks'
