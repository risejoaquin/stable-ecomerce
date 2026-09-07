param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"

function Invoke-Check {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body = $null
  )
  Write-Host "Checking ${Name}: $Url"
  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 10
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  } else {
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
  }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "$Name failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }
$headers = @{ Authorization = "Bearer $token" }

Invoke-Check "Operational automation summary" "Get" "$BaseUrl/api/admin/operational-automation/summary" $headers
Invoke-Check "Report definitions" "Get" "$BaseUrl/api/admin/operational-automation/report-definitions" $headers
Invoke-Check "Run report definitions" "Post" "$BaseUrl/api/admin/operational-automation/report-definitions/run" $headers @{ reportKey="smoke-report-definition" }
Invoke-Check "Report runs" "Get" "$BaseUrl/api/admin/operational-automation/report-runs" $headers
Invoke-Check "Run report runs" "Post" "$BaseUrl/api/admin/operational-automation/report-runs/run" $headers @{ runKey="smoke-report-run"; reportKey="smoke-report-definition" }
Invoke-Check "Review schedules" "Get" "$BaseUrl/api/admin/operational-automation/review-schedules" $headers
Invoke-Check "Run review schedules" "Post" "$BaseUrl/api/admin/operational-automation/review-schedules/run" $headers @{ scheduleKey="smoke-review-schedule" }
Invoke-Check "Alert rules" "Get" "$BaseUrl/api/admin/operational-automation/alert-rules" $headers
Invoke-Check "Run alert rules" "Post" "$BaseUrl/api/admin/operational-automation/alert-rules/run" $headers @{ ruleKey="smoke-alert-rule" }
Invoke-Check "Operational anomalies" "Get" "$BaseUrl/api/admin/operational-automation/anomalies" $headers
Invoke-Check "Run operational anomalies" "Post" "$BaseUrl/api/admin/operational-automation/anomalies/run" $headers @{ anomalyKey="smoke-anomaly" }
Invoke-Check "Risk notifications" "Get" "$BaseUrl/api/admin/operational-automation/risk-notifications" $headers
Invoke-Check "Run risk notifications" "Post" "$BaseUrl/api/admin/operational-automation/risk-notifications/run" $headers @{ notificationKey="smoke-risk-notification" }
Invoke-Check "Campaign followups" "Get" "$BaseUrl/api/admin/operational-automation/campaign-followups" $headers
Invoke-Check "Run campaign followups" "Post" "$BaseUrl/api/admin/operational-automation/campaign-followups/run" $headers @{ automationKey="smoke-campaign-followup" }
Invoke-Check "Support retention followups" "Get" "$BaseUrl/api/admin/operational-automation/support-retention-followups" $headers
Invoke-Check "Run support retention followups" "Post" "$BaseUrl/api/admin/operational-automation/support-retention-followups/run" $headers @{ automationKey="smoke-support-retention" }
Invoke-Check "Executive workflows" "Get" "$BaseUrl/api/admin/operational-automation/executive-workflows" $headers
Invoke-Check "Run executive workflows" "Post" "$BaseUrl/api/admin/operational-automation/executive-workflows/run" $headers @{ workflowKey="smoke-executive-workflow" }
Invoke-Check "Proactive reports" "Get" "$BaseUrl/api/admin/operational-automation/proactive-reports" $headers
Invoke-Check "Run proactive reports" "Post" "$BaseUrl/api/admin/operational-automation/proactive-reports/run" $headers @{ reportKey="smoke-proactive-report" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS operational automation smoke checks"
