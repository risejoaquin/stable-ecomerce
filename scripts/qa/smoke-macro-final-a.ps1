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

Invoke-Check "Macro final A summary" "Get" "$BaseUrl/api/admin/macro-final-a/summary" $headers
Invoke-Check "Experiment definitions" "Get" "$BaseUrl/api/admin/macro-final-a/experiment-definitions" $headers
Invoke-Check "Run experiment definitions" "Post" "$BaseUrl/api/admin/macro-final-a/experiment-definitions/run" $headers @{ experimentKey="smoke-checkout-confidence" }
Invoke-Check "Experiment variants" "Get" "$BaseUrl/api/admin/macro-final-a/experiment-variants" $headers
Invoke-Check "Run experiment variants" "Post" "$BaseUrl/api/admin/macro-final-a/experiment-variants/run" $headers @{ experimentKey="smoke-checkout-confidence" }
Invoke-Check "Conversion learning" "Get" "$BaseUrl/api/admin/macro-final-a/conversion-learning" $headers
Invoke-Check "Run conversion learning" "Post" "$BaseUrl/api/admin/macro-final-a/conversion-learning/run" $headers @{ learningKey="smoke-learning"; experimentKey="smoke-checkout-confidence" }
Invoke-Check "Experiment decisions" "Get" "$BaseUrl/api/admin/macro-final-a/experiment-decisions" $headers
Invoke-Check "Create experiment decision" "Post" "$BaseUrl/api/admin/macro-final-a/experiment-decisions" $headers @{ decisionKey="smoke-decision"; experimentKey="smoke-checkout-confidence"; decision="continue" }
Invoke-Check "Integration connections" "Get" "$BaseUrl/api/admin/macro-final-a/integration-connections" $headers
Invoke-Check "Run integration connections" "Post" "$BaseUrl/api/admin/macro-final-a/integration-connections/run" $headers @{ }
Invoke-Check "Email provider sync" "Get" "$BaseUrl/api/admin/macro-final-a/email-provider-sync" $headers
Invoke-Check "Run email provider sync" "Post" "$BaseUrl/api/admin/macro-final-a/email-provider-sync/run" $headers @{ syncKey="smoke-email-sync" }
Invoke-Check "Ads API sync" "Get" "$BaseUrl/api/admin/macro-final-a/ads-api-sync" $headers
Invoke-Check "Run ads API sync" "Post" "$BaseUrl/api/admin/macro-final-a/ads-api-sync/run" $headers @{ syncKey="smoke-ads-sync" }
Invoke-Check "Analytics destinations" "Get" "$BaseUrl/api/admin/macro-final-a/analytics-destinations" $headers
Invoke-Check "Run analytics destinations" "Post" "$BaseUrl/api/admin/macro-final-a/analytics-destinations/run" $headers @{ eventKey="smoke-analytics-event" }
Invoke-Check "Webhook deliveries" "Get" "$BaseUrl/api/admin/macro-final-a/webhook-deliveries" $headers
Invoke-Check "Run webhook deliveries" "Post" "$BaseUrl/api/admin/macro-final-a/webhook-deliveries/run" $headers @{ deliveryKey="smoke-webhook-delivery" }
Invoke-Check "Financial forecasts" "Get" "$BaseUrl/api/admin/macro-final-a/financial-forecasts" $headers
Invoke-Check "Run financial forecasts" "Post" "$BaseUrl/api/admin/macro-final-a/financial-forecasts/run" $headers @{ forecastKey="smoke-financial-forecast" }
Invoke-Check "Inventory demand" "Get" "$BaseUrl/api/admin/macro-final-a/inventory-demand" $headers
Invoke-Check "Run inventory demand" "Post" "$BaseUrl/api/admin/macro-final-a/inventory-demand/run" $headers @{ forecastKey="smoke-inventory-demand" }
Invoke-Check "Unit economics" "Get" "$BaseUrl/api/admin/macro-final-a/unit-economics" $headers
Invoke-Check "Run unit economics" "Post" "$BaseUrl/api/admin/macro-final-a/unit-economics/run" $headers @{ snapshotKey="smoke-unit-economics" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS macro final A smoke checks"
