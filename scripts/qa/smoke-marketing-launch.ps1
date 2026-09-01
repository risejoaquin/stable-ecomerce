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

Invoke-Check "Marketing launch summary" "Get" "$BaseUrl/api/admin/marketing-launch/summary" $headers
Invoke-Check "Controlled launches" "Get" "$BaseUrl/api/admin/marketing-launch/controlled-launches" $headers
Invoke-Check "Run controlled launch" "Post" "$BaseUrl/api/admin/marketing-launch/controlled-launches/run" $headers @{ launchKey="smoke-controlled-launch" }
Invoke-Check "Paid traffic campaigns" "Get" "$BaseUrl/api/admin/marketing-launch/paid-campaigns" $headers
Invoke-Check "Run paid traffic campaign" "Post" "$BaseUrl/api/admin/marketing-launch/paid-campaigns/run" $headers @{ runKey="smoke-paid-campaign" }
Invoke-Check "Revenue validation" "Get" "$BaseUrl/api/admin/marketing-launch/revenue-validation" $headers
Invoke-Check "Run revenue validation" "Post" "$BaseUrl/api/admin/marketing-launch/revenue-validation/run" $headers @{ snapshotKey="smoke-revenue-validation" }
Invoke-Check "CAC ROAS" "Get" "$BaseUrl/api/admin/marketing-launch/cac-roas" $headers
Invoke-Check "Run CAC ROAS" "Post" "$BaseUrl/api/admin/marketing-launch/cac-roas/run" $headers @{ measurementKey="smoke-cac-roas" }
Invoke-Check "Landing conversions" "Get" "$BaseUrl/api/admin/marketing-launch/landing-conversions" $headers
Invoke-Check "Run landing conversions" "Post" "$BaseUrl/api/admin/marketing-launch/landing-conversions/run" $headers @{ checkKey="smoke-landing-conversion" }
Invoke-Check "Checkout monitoring" "Get" "$BaseUrl/api/admin/marketing-launch/checkout-monitoring" $headers
Invoke-Check "Run checkout monitoring" "Post" "$BaseUrl/api/admin/marketing-launch/checkout-monitoring/run" $headers @{ eventKey="smoke-checkout-monitoring" }
Invoke-Check "Campaign adjustments" "Get" "$BaseUrl/api/admin/marketing-launch/campaign-adjustments" $headers
Invoke-Check "Run campaign adjustments" "Post" "$BaseUrl/api/admin/marketing-launch/campaign-adjustments/run" $headers @{ adjustmentKey="smoke-campaign-adjustment" }
Invoke-Check "Investment scaling" "Get" "$BaseUrl/api/admin/marketing-launch/investment-scaling" $headers
Invoke-Check "Create investment decision" "Post" "$BaseUrl/api/admin/marketing-launch/investment-scaling" $headers @{ decisionKey="smoke-investment-decision"; decision="hold_until_validation" }
Invoke-Check "Launch readiness" "Get" "$BaseUrl/api/admin/marketing-launch/readiness" $headers
Invoke-Check "Run launch readiness" "Post" "$BaseUrl/api/admin/marketing-launch/readiness/run" $headers @{ checkKey="smoke-launch-readiness" }
Invoke-Check "Traffic quality" "Get" "$BaseUrl/api/admin/marketing-launch/traffic-quality" $headers
Invoke-Check "Run traffic quality" "Post" "$BaseUrl/api/admin/marketing-launch/traffic-quality/run" $headers @{ reportKey="smoke-traffic-quality" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS marketing launch smoke checks"
