param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd('/')

function Check-Get($Name, $Url, $Headers = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Body, $Headers = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 12
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

Check-Get "Public campaign landing" "$BaseUrl/api/public/campaigns/skincare-launch/landing"
Check-Get "Public product feed" "$BaseUrl/api/public/product-feed"
Check-Post "Ads event capture" "$BaseUrl/api/ads/events" @{
  platform = "meta"
  eventName = "ViewContent"
  eventId = "smoke-paid-traffic-$(Get-Date -Format yyyyMMddHHmmss)"
  value = 12
  currency = "MXN"
  utm_source = "meta"
  utm_medium = "paid_social"
  utm_campaign = "smoke-test"
  metadata = @{ source = "smoke-paid-traffic" }
}
Check-Post "Experiment assignment" "$BaseUrl/api/experiments/assign" @{
  experimentKey = "home_hero_v1"
  sessionId = "smoke-session-$(Get-Date -Format yyyyMMddHHmmss)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }
$headers = @{ Authorization = "Bearer $token" }

$adminRoutes = @(
  "/api/admin/paid-traffic/summary",
  "/api/admin/paid-traffic/campaigns",
  "/api/admin/paid-traffic/feed",
  "/api/admin/paid-traffic/experiments",
  "/api/admin/paid-traffic/conversion-api",
  "/api/admin/revenue/summary",
  "/api/admin/diagnostics"
)

foreach ($route in $adminRoutes) {
  Check-Get "Admin paid traffic $route" "$BaseUrl$route" $headers
}

Check-Post "Admin create paid campaign" "$BaseUrl/api/admin/paid-traffic/campaigns" @{
  name = "Smoke Paid Campaign"
  slug = "smoke-paid-campaign"
  channel = "meta"
  objective = "conversions"
  status = "draft"
  budget_daily = 0
  utm_source = "meta"
  utm_medium = "paid_social"
  utm_campaign = "smoke-paid-campaign"
} $headers

Check-Post "Admin create AB test" "$BaseUrl/api/admin/experiments" @{
  experimentKey = "smoke_home_hero"
  name = "Smoke Home Hero Test"
  status = "active"
  target_path = "/"
  primary_metric = "checkout_started"
} $headers

Write-Host "PASS paid traffic smoke checks"
