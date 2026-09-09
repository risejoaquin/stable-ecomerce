param(
  [ValidateSet("Report","Enforce")][string]$Mode = "Report"
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $root

$findings = @()
function Finding([string]$Id, [string]$Severity, [string]$Message, [bool]$Present) {
  $script:findings += [pscustomobject]@{ id=$Id; severity=$Severity; message=$Message; present=$Present }
  if ($Present) { Write-Host "FINDING [$Severity] $Id - $Message" -ForegroundColor Yellow }
  else { Write-Host "PASS $Id - $Message" -ForegroundColor Green }
}

$server = Get-Content "server.ts" -Raw

# Known AUDIT-01 trust-boundary checks. These are intentionally source-contract checks;
# dynamic negative tests will be added as each finding is remediated.
$resendRouteMatch = [regex]::Match($server, "app\.post\('/api/webhooks/resend'[\s\S]{0,1400}")
$resendRoute = if ($resendRouteMatch.Success) { $resendRouteMatch.Value } else { "" }
$resendMissingVerification = $resendRoute.Length -gt 0 -and $resendRoute -notmatch "verifyResendWebhookSignature|webhooks\.verify|svix"
Finding "SEC-P0-001" "P0" "Resend webhook route must verify provider signature" $resendMissingVerification

$legacyUpload = $server -match "app\.post\('/api/upload',\s*requireAuth\(\)" -and $server -notmatch "app\.post\('/api/upload',\s*requireAuth\(\),\s*requireAdmin\(\)"
Finding "SEC-P1-001" "P1" "Legacy /api/upload must not be available to every authenticated user" $legacyUpload

$publicLogError = $server -match "app\.post\('/api/log-error'" -and $server -match "appendFileSync"
Finding "SEC-P1-006" "P1" "Public synchronous /api/log-error endpoint should be removed or bounded" $publicLogError

$unsafeInlineScript = $server -match "script-src" -and $server -match "unsafe-inline"
Finding "SEC-P1-005" "P1" "CSP script-src should not rely on unsafe-inline" $unsafeInlineScript

$reportDir = Join-Path $root "artifacts\qa\security-baseline"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
[pscustomobject]@{
  timestamp = (Get-Date).ToString("o")
  mode = $Mode
  findings = $findings
} | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $reportDir "security-baseline.json")

$blocking = @($findings | Where-Object { $_.present -and ($_.severity -eq "P0" -or $_.severity -eq "P1") })
Write-Host "Security baseline findings: $($blocking.Count) blocking P0/P1" -ForegroundColor $(if ($blocking.Count -eq 0) { "Green" } else { "Yellow" })

if ($Mode -eq "Enforce" -and $blocking.Count -gt 0) { exit 1 }
exit 0
