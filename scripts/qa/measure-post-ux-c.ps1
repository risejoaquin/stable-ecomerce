param(
  [string]$BaseUrl = "https://selfcaresinners.com",
  [string[]]$Paths = @("/", "/?search=serum"),
  [ValidateSet("mobile","desktop","both")]
  [string]$Strategy = "both",
  [int]$Runs = 3,
  [string]$OutputDir = ".tmp/post-ux-c",
  [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

if ($Runs -lt 1) { throw "Runs must be >= 1" }

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Join-Url([string]$base, [string]$path) {
  $base = $base.TrimEnd("/")
  if ($path.StartsWith("/")) { return "$base$path" }
  return "$base/$path"
}

function Get-Score($categories, [string]$name) {
  if ($null -eq $categories.$name -or $null -eq $categories.$name.score) { return $null }
  return [math]::Round([double]$categories.$name.score, 3)
}

function Get-AuditValue($audits, [string]$name) {
  if ($null -eq $audits.$name) { return $null }
  if ($null -ne $audits.$name.numericValue) { return [double]$audits.$name.numericValue }
  return $null
}

function Get-FieldMetric($loadingExperience, [string]$name) {
  if ($null -eq $loadingExperience -or $null -eq $loadingExperience.metrics) { return $null }
  $metric = $loadingExperience.metrics.$name
  if ($null -eq $metric) { return $null }
  if ($null -ne $metric.percentile) { return [double]$metric.percentile }
  return $null
}

$strategies = if ($Strategy -eq "both") { @("mobile", "desktop") } else { @($Strategy) }
$rows = @()

foreach ($path in $Paths) {
  $targetUrl = Join-Url $BaseUrl $path
  foreach ($currentStrategy in $strategies) {
    for ($run = 1; $run -le $Runs; $run++) {
      Write-Host "MEASURE $currentStrategy run=$run url=$targetUrl" -ForegroundColor Cyan

      $encodedUrl = [uri]::EscapeDataString($targetUrl)
      $endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$encodedUrl&strategy=$currentStrategy&category=performance&category=accessibility&category=best-practices&category=seo"
      if ($ApiKey.Trim().Length -gt 0) {
        $endpoint += "&key=$([uri]::EscapeDataString($ApiKey))"
      }

      try {
        $result = Invoke-RestMethod -Method Get -Uri $endpoint -TimeoutSec 120
      } catch {
        Write-Warning "PageSpeed request failed for $targetUrl ($currentStrategy run $run): $($_.Exception.Message)"
        continue
      }

      $lh = $result.lighthouseResult
      if ($null -eq $lh) {
        Write-Warning "No lighthouseResult returned for $targetUrl ($currentStrategy run $run)"
        continue
      }

      $audits = $lh.audits
      $categories = $lh.categories

      $row = [pscustomobject]@{
        timestampUtc       = (Get-Date).ToUniversalTime().ToString("o")
        url                = $targetUrl
        strategy           = $currentStrategy
        run                = $run
        performance        = Get-Score $categories "performance"
        accessibility      = Get-Score $categories "accessibility"
        bestPractices      = Get-Score $categories "best-practices"
        seo                = Get-Score $categories "seo"
        fcpMs              = Get-AuditValue $audits "first-contentful-paint"
        lcpMs              = Get-AuditValue $audits "largest-contentful-paint"
        cls                = Get-AuditValue $audits "cumulative-layout-shift"
        tbtMs              = Get-AuditValue $audits "total-blocking-time"
        speedIndexMs       = Get-AuditValue $audits "speed-index"
        labInpMs           = Get-AuditValue $audits "interaction-to-next-paint"
        fieldLcpMs         = Get-FieldMetric $result.loadingExperience "LARGEST_CONTENTFUL_PAINT_MS"
        fieldInpMs         = Get-FieldMetric $result.loadingExperience "INTERACTION_TO_NEXT_PAINT"
        fieldClsRaw        = Get-FieldMetric $result.loadingExperience "CUMULATIVE_LAYOUT_SHIFT_SCORE"
        finalUrl           = $lh.finalUrl
        lighthouseVersion  = $lh.lighthouseVersion
      }

      $rows += $row

      $safeName = (($path -replace '[^a-zA-Z0-9]+','-').Trim('-'))
      if ([string]::IsNullOrWhiteSpace($safeName)) { $safeName = "home" }
      $rawPath = Join-Path $OutputDir ("psi-{0}-{1}-run{2}.json" -f $safeName, $currentStrategy, $run)
      $result | ConvertTo-Json -Depth 100 | Set-Content -Path $rawPath -Encoding UTF8

      Start-Sleep -Seconds 2
    }
  }
}

if ($rows.Count -eq 0) {
  throw "No PageSpeed measurements were captured. Re-run later or provide -ApiKey if quota/rate limiting is the cause."
}

$csvPath = Join-Path $OutputDir "post-ux-c-baseline.csv"
$jsonPath = Join-Path $OutputDir "post-ux-c-baseline.json"

$rows | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
$rows | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

Write-Host ""
Write-Host "POST-UX C BASELINE CAPTURED" -ForegroundColor Green
Write-Host "CSV:  $csvPath"
Write-Host "JSON: $jsonPath"
Write-Host ""
$rows | Format-Table strategy, run, performance, accessibility, bestPractices, seo, lcpMs, cls, tbtMs, fieldLcpMs, fieldInpMs -AutoSize
