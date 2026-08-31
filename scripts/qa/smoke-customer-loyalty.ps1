param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
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
$customer = "smoke-customer-loyalty@selfcaresinners.com"
Check-Get "Customer profile advanced" "$base/api/customer/profile/advanced?email=$customer"
Check-Put "Customer preferences" "$base/api/customer/preferences" @{} @{ email=$customer; skinType="normal"; skincareGoals=@("hydration"); notificationPreferences=@{ email=$true } }
Check-Get "Customer purchase history" "$base/api/customer/purchase-history?email=$customer"
Check-Get "Customer loyalty" "$base/api/customer/loyalty?email=$customer"
Check-Get "Customer wallet" "$base/api/customer/wallet?email=$customer"
Check-Get "Customer rebuy list" "$base/api/customer/rebuy-list?email=$customer"
Check-Get "Customer recommendations" "$base/api/customer/recommendations?email=$customer"
Check-Get "Customer subscriptions" "$base/api/customer/subscriptions?email=$customer"
Check-Post "Create customer subscription" "$base/api/customer/subscriptions" @{} @{ email=$customer; subscriptionType="rebuy_reminder"; cadenceDays=30 }
Check-Get "Admin customer summary" "$base/api/admin/customer-experience/summary" $headers
Check-Get "Admin customers" "$base/api/admin/customer-experience/customers" $headers
Check-Get "Admin segments" "$base/api/admin/customer-experience/segments" $headers
Check-Get "Admin loyalty" "$base/api/admin/customer-experience/loyalty" $headers
Check-Get "Admin subscriptions" "$base/api/admin/customer-experience/subscriptions" $headers
Check-Get "Admin personalization" "$base/api/admin/customer-experience/personalization" $headers
Check-Post "Create segment" "$base/api/admin/customer-experience/segments" $headers @{ name="Smoke Loyalty Segment"; segmentKey="smoke_loyalty_segment"; criteria=@{ source="smoke" } }
Check-Post "Adjust loyalty" "$base/api/admin/customer-experience/loyalty/adjust" $headers @{ email=$customer; points=10; reason="smoke_test" }
Check-Post "Customer notification" "$base/api/admin/customer-experience/customer-notification" $headers @{ email=$customer; title="Smoke notification"; message="Customer experience smoke notification" }
Check-Get "Admin diagnostics" "$base/api/admin/diagnostics" $headers
Write-Host "PASS customer loyalty smoke checks"
