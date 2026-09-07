param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)
$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check-Get($Name, $Url, $Headers) {
  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Headers, $Body) {
  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10) -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Governance summary" "$base/api/admin/governance/summary" $headers
Check-Get "Security audit" "$base/api/admin/governance/security-audit" $headers
Check-Get "Rate limits" "$base/api/admin/governance/rate-limits" $headers
Check-Get "Admin access" "$base/api/admin/governance/admin-access" $headers
Check-Get "Secrets" "$base/api/admin/governance/secrets" $headers
Check-Get "Headers" "$base/api/admin/governance/headers" $headers
Check-Get "Log retention" "$base/api/admin/governance/log-retention" $headers
Check-Get "Backup restore" "$base/api/admin/governance/backup-restore" $headers
Check-Get "Scale readiness" "$base/api/admin/governance/scale-readiness" $headers
Check-Get "Risk matrix" "$base/api/admin/governance/risk-matrix" $headers
Check-Get "Monthly checklist" "$base/api/admin/governance/monthly-checklist" $headers
Check-Post "Run monthly checklist" "$base/api/admin/governance/monthly-checklist/run" $headers @{}
Check-Get "Admin diagnostics" "$base/api/admin/diagnostics" $headers

Write-Host "PASS governance smoke checks"
