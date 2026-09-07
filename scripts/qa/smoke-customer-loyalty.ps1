param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password,
  [string]$CustomerEmail = "smoke-customer-loyalty@selfcaresinners.com",
  [string]$CustomerToken = "",
  [switch]$IncludeCustomerEndpoints
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check-Get($Name, $Url, $Headers = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Headers = @{}, $Body = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 8
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Put($Name, $Url, $Headers = @{}, $Body = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 8
  $response = Invoke-WebRequest -Method Put -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $token" }

# PL12 security decision:
# /api/customer/* belongs to an authenticated customer session.
# The default smoke validates the admin/customer-experience surface only.
# To validate customer-owned endpoints, pass -IncludeCustomerEndpoints and -CustomerToken with a real customer token.
if ($IncludeCustomerEndpoints) {
  if (-not $CustomerToken) {
    throw "Customer endpoint smoke requires -CustomerToken. Do not validate /api/customer/* with only email query params."
  }
  $customerHeaders = @{ Authorization = "Bearer $CustomerToken" }
  Check-Get "Customer profile advanced" "$base/api/customer/profile/advanced" $customerHeaders
  Check-Put "Customer preferences" "$base/api/customer/preferences" $customerHeaders @{ skinType="normal"; skincareGoals=@("hydration"); notificationPreferences=@{ email=$true } }
  Check-Get "Customer purchase history" "$base/api/customer/purchase-history" $customerHeaders
  Check-Get "Customer loyalty" "$base/api/customer/loyalty" $customerHeaders
  Check-Get "Customer wallet" "$base/api/customer/wallet" $customerHeaders
  Check-Get "Customer rebuy list" "$base/api/customer/rebuy-list" $customerHeaders
  Check-Get "Customer recommendations" "$base/api/customer/recommendations" $customerHeaders
  Check-Get "Customer subscriptions" "$base/api/customer/subscriptions" $customerHeaders
  Check-Post "Create customer subscription" "$base/api/customer/subscriptions" $customerHeaders @{ subscriptionType="rebuy_reminder"; cadenceDays=30 }
}

Check-Get "Admin customer summary" "$base/api/admin/customer-experience/summary" $headers
Check-Get "Admin customers" "$base/api/admin/customer-experience/customers" $headers
Check-Get "Admin segments" "$base/api/admin/customer-experience/segments" $headers
Check-Get "Admin loyalty" "$base/api/admin/customer-experience/loyalty" $headers
Check-Get "Admin subscriptions" "$base/api/admin/customer-experience/subscriptions" $headers
Check-Get "Admin personalization" "$base/api/admin/customer-experience/personalization" $headers
Check-Post "Create segment" "$base/api/admin/customer-experience/segments" $headers @{ name="Smoke Loyalty Segment"; segmentKey="smoke_loyalty_segment"; criteria=@{ source="smoke" } }
Check-Post "Adjust loyalty" "$base/api/admin/customer-experience/loyalty/adjust" $headers @{ email=$CustomerEmail; points=10; reason="smoke_test" }
Check-Post "Customer notification" "$base/api/admin/customer-experience/customer-notification" $headers @{ email=$CustomerEmail; title="Smoke notification"; message="Customer experience smoke notification" }
Check-Get "Admin diagnostics" "$base/api/admin/diagnostics" $headers
Write-Host "PASS customer loyalty admin smoke checks"
