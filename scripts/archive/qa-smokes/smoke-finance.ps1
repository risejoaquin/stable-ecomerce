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

function Check-Post($Name, $Url, $Headers = @{}, $Body = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 10
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return a token" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Finance summary" "$BaseUrl/api/admin/finance/summary" $headers
Check-Get "Finance reconciliation" "$BaseUrl/api/admin/finance/reconciliation" $headers
Check-Get "Finance sales" "$BaseUrl/api/admin/finance/sales" $headers
Check-Get "Finance margins" "$BaseUrl/api/admin/finance/margins" $headers
Check-Get "Finance refunds" "$BaseUrl/api/admin/finance/refunds" $headers
Check-Get "Inventory valuation" "$BaseUrl/api/admin/finance/inventory-valuation" $headers
Check-Get "Daily close list" "$BaseUrl/api/admin/finance/daily-close" $headers
Check-Post "Create daily close" "$BaseUrl/api/admin/finance/daily-close" $headers @{ business_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd") }
Check-Get "Orders CSV export" "$BaseUrl/api/admin/finance/export/orders.csv" $headers
Check-Get "Admin diagnostics" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS finance smoke checks"
