$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Resolve-NpmCmd {
  try {
    $resolved = Get-Command npm.cmd -ErrorAction Stop
    if ($resolved -and $resolved.Source) { return $resolved.Source }
  } catch {}

  $candidate = Join-Path $env:ProgramFiles 'nodejs\npm.cmd'
  if (Test-Path $candidate) { return $candidate }

  throw "npm.cmd could not be resolved"
}

$npmCmd = Resolve-NpmCmd
Write-Host "NPM_CMD=$npmCmd"

$packagePath = "package.json"
if (!(Test-Path $packagePath)) {
  throw "Missing package.json"
}

$pkg = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json

if (-not $pkg.dependencies) { throw "package.json dependencies missing" }
if (-not $pkg.overrides) { throw "package.json overrides missing" }

# Approved direct dependency floors.
$pkg.dependencies.dompurify = "^3.4.14"
$pkg.dependencies.'react-router-dom' = "^7.18.2"

# Approved exact transitive security resolutions.
$approvedOverrides = [ordered]@{
  "brace-expansion" = "5.0.9"
  "browserslist"    = "4.28.8"
  "ip-address"      = "10.5.0"
  "nanoid"          = "3.3.18"
  "postcss"         = "8.5.28"
  "qs"              = "6.16.0"
  "react-router"    = "7.18.2"
  "undici"          = "7.29.0"
}

foreach ($entry in $approvedOverrides.GetEnumerator()) {
  $pkg.overrides | Add-Member -NotePropertyName $entry.Key -NotePropertyValue $entry.Value -Force
}

$json = $pkg | ConvertTo-Json -Depth 100
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $packagePath).Path, $json + "`n", $utf8NoBom)

Write-Host "PASS approved security resolutions enforced in package.json"

Write-Host "Refreshing dependency resolution with npm.cmd install..."
& $npmCmd install
if ($LASTEXITCODE -ne 0) {
  throw "npm install failed"
}
Write-Host "PASS npm install completed"

$checks = @(
  @{ Name = "brace-expansion"; Version = "5.0.9" },
  @{ Name = "browserslist"; Version = "4.28.8" },
  @{ Name = "ip-address"; Version = "10.5.0" },
  @{ Name = "nanoid"; Version = "3.3.18" },
  @{ Name = "postcss"; Version = "8.5.28" },
  @{ Name = "qs"; Version = "6.16.0" },
  @{ Name = "react-router"; Version = "7.18.2" },
  @{ Name = "undici"; Version = "7.29.0" }
)

foreach ($check in $checks) {
  $output = & $npmCmd ls $check.Name --json 2>$null
  if ($LASTEXITCODE -ne 0 -and -not $output) {
    throw "FAIL npm ls $($check.Name)"
  }

  $tree = ($output -join "`n") | ConvertFrom-Json
  $found = New-Object System.Collections.Generic.List[string]

  function Find-Versions($node, [string]$packageName) {
    if ($null -eq $node) { return }
    if ($node.dependencies) {
      foreach ($prop in $node.dependencies.PSObject.Properties) {
        if ($prop.Name -eq $packageName -and $prop.Value.version) {
          $script:found.Add([string]$prop.Value.version)
        }
        Find-Versions $prop.Value $packageName
      }
    }
  }

  $script:found = New-Object System.Collections.Generic.List[string]
  Find-Versions $tree $check.Name
  $versions = @($script:found | Sort-Object -Unique)

  if ($versions.Count -eq 0) {
    throw "FAIL $($check.Name) not found in installed tree"
  }

  $bad = @($versions | Where-Object { $_ -ne $check.Version })
  if ($bad.Count -gt 0) {
    throw "FAIL $($check.Name) expected $($check.Version), found: $($versions -join ', ')"
  }

  Write-Host "PASS $($check.Name) => $($check.Version)"
}

Write-Host "Checking direct dependency versions..."
& $npmCmd ls dompurify react-router-dom
if ($LASTEXITCODE -ne 0) {
  throw "FAIL direct dependency tree validation"
}

Write-Host "Running HIGH/CRITICAL audit gate..."
& $npmCmd audit --audit-level=high
if ($LASTEXITCODE -ne 0) {
  throw "FAIL HIGH/CRITICAL vulnerabilities remain - do not run npm audit fix blindly"
}

Write-Host "PASS POST-UX A HOTFIX 07 dependency resolution convergence"
