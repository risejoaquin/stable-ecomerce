param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check($Name, $Method, $Url, $Headers = @{}, $Body = $null) {
  Write-Host "Checking ${Name}: ${Url}"
  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 20
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  } else {
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
  }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }
$headers = @{ Authorization = "Bearer $token" }

Check "Channels summary" "Get" "$base/api/admin/channels/summary" $headers
Check "Channels" "Get" "$base/api/admin/channels" $headers
Check "Create channel" "Post" "$base/api/admin/channels" $headers @{
  channelKey = "smoke_marketplace"
  name = "Smoke Marketplace"
  channelType = "marketplace"
  platform = "custom"
  status = "ready"
  isActive = $true
}
Check "Product feeds" "Get" "$base/api/admin/channels/product-feeds" $headers
Check "Run product feeds" "Post" "$base/api/admin/channels/product-feeds/run" $headers @{ feedType = "product_catalog"; source = "smoke-channels" }
Check "Inventory sync" "Get" "$base/api/admin/channels/inventory-sync" $headers
Check "Run inventory sync" "Post" "$base/api/admin/channels/inventory-sync/run" $headers @{ source = "smoke-channels" }
Check "External orders" "Get" "$base/api/admin/channels/external-orders" $headers
Check "Channel performance" "Get" "$base/api/admin/channels/performance" $headers
Check "Admin diagnostics" "Get" "$base/api/admin/diagnostics" $headers

Write-Host "PASS channels smoke checks"
