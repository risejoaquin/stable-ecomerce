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

Invoke-Check "Customer success summary" "Get" "$BaseUrl/api/admin/customer-success/summary" $headers
Invoke-Check "Post purchase experience" "Get" "$BaseUrl/api/admin/customer-success/post-purchase" $headers
Invoke-Check "Run post purchase experience" "Post" "$BaseUrl/api/admin/customer-success/post-purchase/run" $headers @{ checkKey="smoke-post-purchase" }
Invoke-Check "Customer satisfaction" "Get" "$BaseUrl/api/admin/customer-success/satisfaction" $headers
Invoke-Check "Run customer satisfaction" "Post" "$BaseUrl/api/admin/customer-success/satisfaction/run" $headers @{ measurementKey="smoke-satisfaction" }
Invoke-Check "Support followups" "Get" "$BaseUrl/api/admin/customer-success/support-followups" $headers
Invoke-Check "Run support followup" "Post" "$BaseUrl/api/admin/customer-success/support-followups/run" $headers @{ taskKey="smoke-support-followup" }
Invoke-Check "Repeat purchase" "Get" "$BaseUrl/api/admin/customer-success/repeat-purchase" $headers
Invoke-Check "Run repeat purchase" "Post" "$BaseUrl/api/admin/customer-success/repeat-purchase/run" $headers @{ measurementKey="smoke-repeat-purchase" }
Invoke-Check "Retention activation" "Get" "$BaseUrl/api/admin/customer-success/retention-activation" $headers
Invoke-Check "Run retention activation" "Post" "$BaseUrl/api/admin/customer-success/retention-activation/run" $headers @{ runKey="smoke-retention-activation" }
Invoke-Check "Post purchase emails" "Get" "$BaseUrl/api/admin/customer-success/post-purchase-emails" $headers
Invoke-Check "Run post purchase emails" "Post" "$BaseUrl/api/admin/customer-success/post-purchase-emails/run" $headers @{ optimizationKey="smoke-post-purchase-email" }
Invoke-Check "Complaints returns" "Get" "$BaseUrl/api/admin/customer-success/complaints-returns" $headers
Invoke-Check "Run complaints returns" "Post" "$BaseUrl/api/admin/customer-success/complaints-returns/run" $headers @{ caseKey="smoke-complaint-return" }
Invoke-Check "NPS CSAT" "Get" "$BaseUrl/api/admin/customer-success/nps-csat" $headers
Invoke-Check "Run NPS CSAT" "Post" "$BaseUrl/api/admin/customer-success/nps-csat/run" $headers @{ surveyKey="smoke-nps-csat" }
Invoke-Check "Recurring customers" "Get" "$BaseUrl/api/admin/customer-success/recurring-customers" $headers
Invoke-Check "Run recurring customers" "Post" "$BaseUrl/api/admin/customer-success/recurring-customers/run" $headers @{ reportKey="smoke-recurring-customers" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS customer success smoke checks"
