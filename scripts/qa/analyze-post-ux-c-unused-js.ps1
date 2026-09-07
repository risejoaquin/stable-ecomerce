param(
  [string]$InputDir = ".tmp/post-ux-c-local",
  [string]$OutputDir = ".tmp/post-ux-c-js-waste"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

if (!(Test-Path $InputDir)) {
  throw "Input directory not found: $InputDir"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$files = Get-ChildItem -Path $InputDir -Filter "lighthouse-*.json" -File |
  Sort-Object LastWriteTime

if ($files.Count -eq 0) {
  throw "No raw Lighthouse JSON files found under $InputDir"
}

$rows = @()

foreach ($file in $files) {
  $lh = Get-Content $file.FullName -Raw | ConvertFrom-Json
  $audit = $lh.audits.'unused-javascript'

  if ($null -eq $audit -or $null -eq $audit.details -or $null -eq $audit.details.items) {
    continue
  }

  foreach ($item in @($audit.details.items)) {
    $url = [string]$item.url
    $totalBytes = [double]($item.totalBytes)
    $wastedBytes = [double]($item.wastedBytes)

    $rows += [pscustomobject]@{
      report        = $file.Name
      finalUrl      = $lh.finalUrl
      performance   = $lh.categories.performance.score
      scriptUrl     = $url
      totalKB       = [math]::Round($totalBytes / 1KB, 2)
      wastedKB      = [math]::Round($wastedBytes / 1KB, 2)
      wastedPercent = if ($totalBytes -gt 0) { [math]::Round(($wastedBytes / $totalBytes) * 100, 1) } else { 0 }
    }
  }
}

if ($rows.Count -eq 0) {
  throw "No unused-javascript detail rows were found in the Lighthouse JSON reports."
}

$out = Join-Path $OutputDir "post-ux-c-unused-js-detail.csv"
$rows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $out

Write-Host ""
Write-Host "POST-UX C UNUSED JS DETAIL COMPLETE" -ForegroundColor Green
Write-Host "CSV: $out"
Write-Host ""

Write-Host "=== UNUSED JS BY REPORT ===" -ForegroundColor Yellow
$rows |
  Sort-Object report, wastedKB -Descending |
  Format-Table report,totalKB,wastedKB,wastedPercent,scriptUrl -AutoSize

Write-Host ""
Write-Host "=== AGGREGATED BY SCRIPT URL ===" -ForegroundColor Yellow
$rows |
  Group-Object scriptUrl |
  ForEach-Object {
    $items = $_.Group
    [pscustomobject]@{
      scriptUrl       = $_.Name
      reports         = $items.Count
      avgTotalKB      = [math]::Round((($items | Measure-Object totalKB -Average).Average), 2)
      avgWastedKB     = [math]::Round((($items | Measure-Object wastedKB -Average).Average), 2)
      maxWastedKB     = [math]::Round((($items | Measure-Object wastedKB -Maximum).Maximum), 2)
      avgWastedPct    = [math]::Round((($items | Measure-Object wastedPercent -Average).Average), 1)
    }
  } |
  Sort-Object avgWastedKB -Descending |
  Format-Table reports,avgTotalKB,avgWastedKB,maxWastedKB,avgWastedPct,scriptUrl -AutoSize

Write-Host ""
Write-Host "IMPORTANT: Only compare reports generated after the latest production deploy." -ForegroundColor Cyan
