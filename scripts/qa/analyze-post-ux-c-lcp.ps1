param(
  [string]$InputDir = ".tmp/post-ux-c-local",
  [string]$OutputDir = ".tmp/post-ux-c-analysis"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

if (!(Test-Path $InputDir)) { throw "Input directory not found: $InputDir" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Get-Audit($lh, [string]$id) {
  if ($null -eq $lh.audits) { return $null }
  return $lh.audits.$id
}

function Get-LcpNodeText($lh) {
  $audit = Get-Audit $lh "largest-contentful-paint-element"
  if ($null -eq $audit -or $null -eq $audit.details) { return $null }
  foreach ($item in @($audit.details.items)) {
    if ($null -ne $item.node -and $item.node.snippet) { return [string]$item.node.snippet }
    foreach ($nested in @($item.items)) {
      if ($null -ne $nested.node -and $nested.node.snippet) { return [string]$nested.node.snippet }
    }
  }
  return $null
}

function Read-DurationMs($item) {
  if ($null -ne $item.endTime -and $null -ne $item.startTime) {
    return [math]::Round((([double]$item.endTime - [double]$item.startTime) * 1000), 1)
  }
  return $null
}

$files = Get-ChildItem -Path $InputDir -Filter "lighthouse-*.json" -File | Sort-Object LastWriteTime
if ($files.Count -eq 0) { throw "No raw Lighthouse JSON files found under $InputDir" }

$summaryRows = @()
$imageRows = @()
$opportunityRows = @()

foreach ($file in $files) {
  Write-Host "ANALYZE $($file.Name)" -ForegroundColor Cyan
  $lh = Get-Content $file.FullName -Raw | ConvertFrom-Json

  $networkAudit = Get-Audit $lh "network-requests"
  $networkItems = if ($networkAudit -and $networkAudit.details) { @($networkAudit.details.items) } else { @() }

  $document = $networkItems |
    Where-Object { $_.resourceType -eq "Document" -or $_.mimeType -like "text/html*" } |
    Select-Object -First 1

  $images = @($networkItems | Where-Object { $_.resourceType -eq "Image" -or $_.mimeType -like "image/*" })

  $largestImage = $images |
    Sort-Object { [double]($_.transferSize) } -Descending |
    Select-Object -First 1

  $slowestImage = $images |
    Sort-Object { Read-DurationMs $_ } -Descending |
    Select-Object -First 1

  $lcpAudit = Get-Audit $lh "largest-contentful-paint"

  $summaryRows += [pscustomobject]@{
    report                = $file.Name
    finalUrl               = $lh.finalUrl
    lighthouseVersion      = $lh.lighthouseVersion
    performance            = $lh.categories.performance.score
    lcpMs                  = if ($lcpAudit -and $null -ne $lcpAudit.numericValue) { [double]$lcpAudit.numericValue } else { $null }
    lcpElement             = Get-LcpNodeText $lh
    documentTransferKB     = if ($document) { [math]::Round(([double]$document.transferSize / 1KB), 2) } else { $null }
    documentDurationMs     = if ($document) { Read-DurationMs $document } else { $null }
    largestImageKB         = if ($largestImage) { [math]::Round(([double]$largestImage.transferSize / 1KB), 2) } else { $null }
    largestImageUrl        = if ($largestImage) { $largestImage.url } else { $null }
    slowestImageDurationMs = if ($slowestImage) { Read-DurationMs $slowestImage } else { $null }
    slowestImageUrl        = if ($slowestImage) { $slowestImage.url } else { $null }
  }

  foreach ($img in $images) {
    $imageRows += [pscustomobject]@{
      report     = $file.Name
      finalUrl   = $lh.finalUrl
      url        = $img.url
      mimeType   = $img.mimeType
      transferKB = [math]::Round(([double]$img.transferSize / 1KB), 2)
      resourceKB = [math]::Round(([double]$img.resourceSize / 1KB), 2)
      durationMs = Read-DurationMs $img
      statusCode = $img.statusCode
      protocol   = $img.protocol
    }
  }

  foreach ($id in @(
    "server-response-time",
    "render-blocking-resources",
    "uses-responsive-images",
    "uses-optimized-images",
    "modern-image-formats",
    "offscreen-images",
    "unused-javascript",
    "lcp-lazy-loaded"
  )) {
    $audit = Get-Audit $lh $id
    if ($audit) {
      $opportunityRows += [pscustomobject]@{
        report       = $file.Name
        finalUrl     = $lh.finalUrl
        audit        = $id
        score        = $audit.score
        displayValue = $audit.displayValue
        numericValue = $audit.numericValue
      }
    }
  }
}

$summaryPath = Join-Path $OutputDir "post-ux-c-lcp-summary.csv"
$imagesPath = Join-Path $OutputDir "post-ux-c-image-network.csv"
$oppsPath = Join-Path $OutputDir "post-ux-c-opportunities.csv"

$summaryRows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $summaryPath
$imageRows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $imagesPath
$opportunityRows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $oppsPath

Write-Host ""
Write-Host "POST-UX C LCP ANALYSIS COMPLETE" -ForegroundColor Green
Write-Host "Summary:       $summaryPath"
Write-Host "Image network: $imagesPath"
Write-Host "Opportunities: $oppsPath"
Write-Host ""
Write-Host "=== LCP SUMMARY ===" -ForegroundColor Yellow
$summaryRows | Format-Table report,performance,lcpMs,largestImageKB,documentDurationMs,slowestImageDurationMs -AutoSize

Write-Host ""
Write-Host "=== LCP ELEMENT / IMAGE URLS ===" -ForegroundColor Yellow
$summaryRows | Select-Object report,lcpElement,largestImageUrl,slowestImageUrl | Format-List

Write-Host ""
Write-Host "=== FAILED / PARTIAL OPPORTUNITIES ===" -ForegroundColor Yellow
$opportunityRows | Where-Object { $_.score -ne 1 } |
  Format-Table report,audit,score,displayValue,numericValue -AutoSize
