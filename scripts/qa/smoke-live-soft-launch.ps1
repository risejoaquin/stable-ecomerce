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

Invoke-Check "Live soft launch summary" "Get" "$BaseUrl/api/admin/live-soft-launch/summary" $headers
Invoke-Check "Soft launch runs" "Get" "$BaseUrl/api/admin/live-soft-launch/runs" $headers
Invoke-Check "Run soft launch" "Post" "$BaseUrl/api/admin/live-soft-launch/runs/run" $headers @{ runKey="smoke-soft-launch" }
Invoke-Check "Live traffic sessions" "Get" "$BaseUrl/api/admin/live-soft-launch/sessions" $headers
Invoke-Check "Create traffic session" "Post" "$BaseUrl/api/admin/live-soft-launch/sessions" $headers @{ sessionKey="smoke-session"; channel="direct"; landingPath="/" }
Invoke-Check "Live conversions" "Get" "$BaseUrl/api/admin/live-soft-launch/conversions" $headers
Invoke-Check "Create conversion event" "Post" "$BaseUrl/api/admin/live-soft-launch/conversions" $headers @{ eventKey="smoke-conversion"; eventType="checkout_started"; funnelStep="checkout" }
Invoke-Check "Checkout observations" "Get" "$BaseUrl/api/admin/live-soft-launch/checkout-observations" $headers
Invoke-Check "Run checkout observations" "Post" "$BaseUrl/api/admin/live-soft-launch/checkout-observations/run" $headers @{ observationKey="smoke-checkout-observation" }
Invoke-Check "Revenue events" "Get" "$BaseUrl/api/admin/live-soft-launch/revenue-events" $headers
Invoke-Check "Run revenue events" "Post" "$BaseUrl/api/admin/live-soft-launch/revenue-events/run" $headers @{ eventKey="smoke-revenue-event"; revenueCents=1200 }
Invoke-Check "Support signals" "Get" "$BaseUrl/api/admin/live-soft-launch/support-signals" $headers
Invoke-Check "Run support signals" "Post" "$BaseUrl/api/admin/live-soft-launch/support-signals/run" $headers @{ signalKey="smoke-support-signal" }
Invoke-Check "Campaign health" "Get" "$BaseUrl/api/admin/live-soft-launch/campaign-health" $headers
Invoke-Check "Run campaign health" "Post" "$BaseUrl/api/admin/live-soft-launch/campaign-health/run" $headers @{ snapshotKey="smoke-campaign-health" }
Invoke-Check "Incident watch" "Get" "$BaseUrl/api/admin/live-soft-launch/incidents" $headers
Invoke-Check "Run incident watch" "Post" "$BaseUrl/api/admin/live-soft-launch/incidents/run" $headers @{ incidentKey="smoke-incident-watch" }
Invoke-Check "Iteration actions" "Get" "$BaseUrl/api/admin/live-soft-launch/iteration-actions" $headers
Invoke-Check "Run iteration actions" "Post" "$BaseUrl/api/admin/live-soft-launch/iteration-actions/run" $headers @{ actionKey="smoke-iteration-action" }
Invoke-Check "Daily reports" "Get" "$BaseUrl/api/admin/live-soft-launch/daily-reports" $headers
Invoke-Check "Run daily reports" "Post" "$BaseUrl/api/admin/live-soft-launch/daily-reports/run" $headers @{ reportKey="smoke-daily-report" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS live soft launch smoke checks"
