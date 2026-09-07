param(
  [string]$BaseUrl = "https://selfcaresinners.com",
  [string[]]$Paths = @("/", "/?search=serum"),
  [ValidateSet("mobile","desktop","both")]
  [string]$Strategy = "both",
  [int]$Runs = 3,
  [string]$OutputDir = ".tmp/post-ux-c-local"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Join-Url([string]$base, [string]$path) {
  $base = $base.TrimEnd("/")
  if ($path.StartsWith("/")) { return "$base$path" }
  return "$base/$path"
}

function Read-Metric($obj, [string]$auditName) {
  $audit = $obj.audits.$auditName
  if ($null -eq $audit -or $null -eq $audit.numericValue) { return $null }
  return [double]$audit.numericValue
}

function Read-Score($obj, [string]$categoryName) {
  $cat = $obj.categories.$categoryName
  if ($null -eq $cat -or $null -eq $cat.score) { return $null }
  return [math]::Round([double]$cat.score, 3)
}

function Resolve-NpmCmd {
  $candidate = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -ne $candidate) {
    return $candidate.Source
  }

  $fallback = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
  if (Test-Path $fallback) {
    return $fallback
  }

  throw "npm.cmd was not found. Verify Node/npm installation and PATH."
}

function Test-ValidLighthouseJson([string]$jsonPath, [string]$requestedUrl) {
  if (!(Test-Path $jsonPath)) {
    return $false
  }

  try {
    $candidate = Get-Content $jsonPath -Raw | ConvertFrom-Json
  } catch {
    return $false
  }

  if ($null -ne $candidate.runtimeError) {
    return $false
  }

  if ([string]::IsNullOrWhiteSpace([string]$candidate.finalUrl)) {
    return $false
  }

  try {
    $requested = [uri]$requestedUrl
    $final = [uri]$candidate.finalUrl
    if ($requested.Host -ne $final.Host -or $requested.AbsolutePath.TrimEnd("/") -ne $final.AbsolutePath.TrimEnd("/")) {
      return $false
    }
  } catch {
    return $false
  }

  foreach ($categoryName in @("performance","accessibility","best-practices","seo")) {
    $category = $candidate.categories.$categoryName
    if ($null -eq $category -or $null -eq $category.score) {
      return $false
    }
  }

  $lcp = $candidate.audits."largest-contentful-paint"
  if ($null -eq $lcp -or $null -eq $lcp.numericValue) {
    return $false
  }

  return $true
}

$npmCmd = Resolve-NpmCmd
Write-Host "NPM_CMD=$npmCmd" -ForegroundColor DarkGray

function Invoke-Lighthouse([string]$url, [string]$strategy, [string]$jsonOut) {
  $args = @(
    "exec",
    "--yes",
    "--package=lighthouse",
    "--",
    "lighthouse",
    $url,
    "--quiet",
    "--output=json",
    "--output-path=$jsonOut",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--chrome-flags=--headless --no-sandbox --disable-gpu"
  )

  if ($strategy -eq "desktop") {
    $args += "--preset=desktop"
  }

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $script:npmCmd @args 2>&1
    $exit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }

  if ($exit -ne 0) {
    $text = ($output | Out-String)

    $cleanupEperm = (
      $text -match "EPERM|Permission denied" -and
      $text -match "Launcher\.destroyTmp|Launcher\.kill|rmSync"
    )

    if ($cleanupEperm -and (Test-ValidLighthouseJson $jsonOut $url)) {
      Write-Warning "LIGHTHOUSE_CLEANUP_EPERM_AFTER_VALID_JSON for $url ($strategy); accepting completed report."
      if ($text.Trim().Length -gt 0) {
        Write-Host $text
      }
      return $true
    }

    if ($text -match "could not determine executable to run|Unknown command") {
      Write-Warning "NPM_CMD_EXECUTION_FAILURE for $url ($strategy)"
    } elseif ($text -match "Chrome|Chromium|CHROME_PATH|browser") {
      Write-Warning "CHROME_LAUNCH_FAILURE for $url ($strategy)"
    } else {
      Write-Warning "LIGHTHOUSE_EXECUTION_FAILURE for $url ($strategy)"
    }

    if ($text.Trim().Length -gt 0) {
      Write-Host $text
    }
    return $false
  }

  if (!(Test-ValidLighthouseJson $jsonOut $url)) {
    Write-Warning "LIGHTHOUSE_INVALID_JSON for $url ($strategy): $jsonOut"
    return $false
  }

  return $true
}

$strategies = if ($Strategy -eq "both") { @("mobile","desktop") } else { @($Strategy) }
$rows = @()

foreach ($path in $Paths) {
  $targetUrl = Join-Url $BaseUrl $path

  foreach ($currentStrategy in $strategies) {
    for ($run = 1; $run -le $Runs; $run++) {
      $safe = (($path -replace '[^a-zA-Z0-9]+','-').Trim('-'))
      if ([string]::IsNullOrWhiteSpace($safe)) { $safe = "home" }

      $jsonOut = Join-Path $OutputDir ("lighthouse-{0}-{1}-run{2}.json" -f $safe,$currentStrategy,$run)
      if (Test-Path $jsonOut) { Remove-Item $jsonOut -Force }

      Write-Host "LIGHTHOUSE $currentStrategy run=$run url=$targetUrl" -ForegroundColor Cyan

      $ok = Invoke-Lighthouse $targetUrl $currentStrategy $jsonOut
      if (-not $ok) { continue }

      if (!(Test-Path $jsonOut)) {
        Write-Warning "Lighthouse JSON not generated: $jsonOut"
        continue
      }

      $lh = Get-Content $jsonOut -Raw | ConvertFrom-Json
      $rows += [pscustomobject]@{
        timestampUtc      = (Get-Date).ToUniversalTime().ToString("o")
        url               = $targetUrl
        strategy          = $currentStrategy
        run               = $run
        performance       = Read-Score $lh "performance"
        accessibility     = Read-Score $lh "accessibility"
        bestPractices     = Read-Score $lh "best-practices"
        seo               = Read-Score $lh "seo"
        fcpMs             = Read-Metric $lh "first-contentful-paint"
        lcpMs             = Read-Metric $lh "largest-contentful-paint"
        cls               = Read-Metric $lh "cumulative-layout-shift"
        tbtMs             = Read-Metric $lh "total-blocking-time"
        speedIndexMs      = Read-Metric $lh "speed-index"
        finalUrl          = $lh.finalUrl
        lighthouseVersion = $lh.lighthouseVersion
      }
    }
  }
}

if ($rows.Count -eq 0) {
  throw "No local Lighthouse measurements were captured. Review NPM_CMD_EXECUTION_FAILURE / CHROME_LAUNCH_FAILURE / LIGHTHOUSE_EXECUTION_FAILURE messages above."
}

$csvPath = Join-Path $OutputDir "post-ux-c-local-baseline.csv"
$jsonPath = Join-Path $OutputDir "post-ux-c-local-baseline.json"
$rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
$rows | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

Write-Host ""
Write-Host "POST-UX C LOCAL LIGHTHOUSE BASELINE CAPTURED" -ForegroundColor Green
Write-Host "CSV:  $csvPath"
Write-Host "JSON: $jsonPath"
Write-Host ""
$rows | Format-Table strategy,run,performance,accessibility,bestPractices,seo,lcpMs,cls,tbtMs,speedIndexMs -AutoSize
