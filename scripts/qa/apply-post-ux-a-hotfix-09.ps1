$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "scripts\qa\smoke-post-ux-a.ps1"
if (!(Test-Path $path)) { throw "Missing file: $path" }

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

if ($content.Contains("POST UX A semantic package validation")) {
  Write-Host "SKIP already applied: semantic package.json validation" -ForegroundColor Yellow
  Write-Host "PASS POST-UX A HOTFIX 09 applied" -ForegroundColor Green
  exit 0
}

$startMarker = "Assert-Contains 'package.json'"
$lockMarker = '$lockText = Get-Content -Raw -LiteralPath ''package-lock.json'''

$startIndex = $content.IndexOf($startMarker)
$lockIndex = $content.IndexOf($lockMarker)

if ($startIndex -lt 0 -or $lockIndex -lt 0 -or $lockIndex -le $startIndex) {
  throw "Could not locate package.json assertion block in smoke-post-ux-a.ps1"
}

$semanticBlock = @"
if (!(Test-Path 'package.json')) {
  throw 'FAIL package.json exists'
}

try {
  `$pkg = Get-Content -Raw -LiteralPath 'package.json' | ConvertFrom-Json
} catch {
  throw 'FAIL package.json parses as JSON'
}

Write-Host 'PASS package.json parses as JSON'

`$directChecks = @(
  @{ Name = 'dompurify'; Expected = '^3.4.14'; Label = 'DOMPurify direct patch exists' },
  @{ Name = 'react-router-dom'; Expected = '^7.18.2'; Label = 'react router DOM direct patch exists' }
)

foreach (`$check in `$directChecks) {
  `$actual = `$pkg.dependencies.(`$check.Name)
  if (`$actual -ne `$check.Expected) {
    throw "FAIL `$(`$check.Label) - expected `$(`$check.Expected), found `$actual"
  }
  Write-Host "PASS `$(`$check.Label)"
}

`$overrideChecks = @(
  @{ Name = 'brace-expansion'; Expected = '5.0.9'; Label = 'brace expansion patched override exists' },
  @{ Name = 'browserslist'; Expected = '4.28.8'; Label = 'browserslist patched override exists' },
  @{ Name = 'ip-address'; Expected = '10.5.0'; Label = 'ip address patched override exists' },
  @{ Name = 'nanoid'; Expected = '3.3.18'; Label = 'nanoid patched override exists' },
  @{ Name = 'postcss'; Expected = '8.5.28'; Label = 'postcss patched override exists' },
  @{ Name = 'qs'; Expected = '6.16.0'; Label = 'qs patched override exists' },
  @{ Name = 'react-router'; Expected = '7.18.2'; Label = 'react router patched override exists' },
  @{ Name = 'undici'; Expected = '7.29.0'; Label = 'undici patched override exists' }
)

foreach (`$check in `$overrideChecks) {
  `$actual = `$pkg.overrides.(`$check.Name)
  if (`$actual -ne `$check.Expected) {
    throw "FAIL `$(`$check.Label) - expected `$(`$check.Expected), found `$actual"
  }
  Write-Host "PASS `$(`$check.Label)"
}

Write-Host 'PASS POST UX A semantic package validation'

"@

$newContent = $content.Substring(0, $startIndex) + $semanticBlock + $content.Substring($lockIndex)
[System.IO.File]::WriteAllText($full, $newContent, $utf8NoBom)

Write-Host "PATCH POST-UX A main smoke now validates package.json semantically" -ForegroundColor Green
Write-Host "PASS POST-UX A HOTFIX 09 applied" -ForegroundColor Green
