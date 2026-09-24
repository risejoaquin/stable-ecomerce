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
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "$Name failed with $($response.StatusCode)" }
  Write-Host "PASS $Name -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Body, $Headers = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 10
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "$Name failed with $($response.StatusCode)" }
  Write-Host "PASS $Name -> $($response.StatusCode)"
  return $response.Content | ConvertFrom-Json
}

$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body (@{ email=$Email; password=$Password } | ConvertTo-Json)
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Fulfillment summary" "$BaseUrl/api/admin/fulfillment/summary" $headers
Check-Get "Ready to ship" "$BaseUrl/api/admin/fulfillment/ready-to-ship" $headers
Check-Get "Late orders" "$BaseUrl/api/admin/fulfillment/late-orders" $headers
Check-Get "Support tickets" "$BaseUrl/api/admin/support/tickets" $headers
Check-Get "Support SLA" "$BaseUrl/api/admin/support/sla" $headers
Check-Get "Support templates" "$BaseUrl/api/admin/support/templates" $headers
Check-Get "Support messages" "$BaseUrl/api/admin/support/messages" $headers
Check-Get "Admin diagnostics" "$BaseUrl/api/admin/diagnostics" $headers

# Use an existing order if available for service-history and incident smoke.
$ordersResponse = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/orders" -Headers $headers
$orderId = $null
if ($ordersResponse.orders -and $ordersResponse.orders.Count -gt 0) { $orderId = $ordersResponse.orders[0].id }
elseif ($ordersResponse[0] -and $ordersResponse[0].id) { $orderId = $ordersResponse[0].id }

if ($orderId) {
  Check-Get "Order service history" "$BaseUrl/api/admin/orders/$orderId/service-history" $headers
  Check-Post "Order incident create" "$BaseUrl/api/admin/orders/$orderId/incident" @{ incident_type="qa_smoke"; severity="low"; description="QA smoke incident for fulfillment support validation." } $headers | Out-Null
}

Write-Host "PASS fulfillment support smoke checks"
