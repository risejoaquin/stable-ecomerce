param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check-PublicPost($Name, $Path, $Body) {
  $url = "$base$Path"
  Write-Host "Checking ${Name}: $url"
  $json = $Body | ConvertTo-Json -Depth 10
  $response = Invoke-WebRequest -Method Post -Uri $url -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL $Name -> $($response.StatusCode)" }
  Write-Host "PASS $Name -> $($response.StatusCode)"
}

function Check-Admin($Path, $Headers) {
  $url = "$base$Path"
  Write-Host "Checking admin revenue: $url"
  $response = Invoke-WebRequest -Method Get -Uri $url -Headers $Headers -UseBasicParsing
  if ($response.StatusCode -ne 200) { throw "FAIL $Path -> $($response.StatusCode)" }
  Write-Host "PASS $Path -> 200"
}

$sessionId = "smoke-" + [guid]::NewGuid().ToString()

Check-PublicPost "UTM capture" "/api/analytics/utm" @{
  sessionId = $sessionId
  utm_source = "smoke"
  utm_medium = "qa"
  utm_campaign = "post_launch_05"
  landing_path = "/"
}

Check-PublicPost "Conversion event" "/api/analytics/conversion" @{
  sessionId = $sessionId
  eventType = "add_to_cart"
  value = 12
  currency = "MXN"
  metadata = @{ source = "smoke-revenue" }
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }
$headers = @{ Authorization = "Bearer $token" }

Check-Admin "/api/admin/revenue/summary" $headers
Check-Admin "/api/admin/revenue/funnel" $headers
Check-Admin "/api/admin/revenue/campaigns" $headers
Check-Admin "/api/admin/revenue/customers" $headers
Check-Admin "/api/admin/revenue/automation" $headers
Check-Admin "/api/admin/diagnostics" $headers

$runBody = @{ jobType = "manual_revenue_check" } | ConvertTo-Json
$runResponse = Invoke-WebRequest -Method Post -Uri "$base/api/admin/automation/run" -Headers $headers -ContentType "application/json" -Body $runBody -UseBasicParsing
if ($runResponse.StatusCode -lt 200 -or $runResponse.StatusCode -ge 300) { throw "FAIL /api/admin/automation/run -> $($runResponse.StatusCode)" }
Write-Host "PASS /api/admin/automation/run -> $($runResponse.StatusCode)"

Write-Host "PASS revenue smoke checks"
