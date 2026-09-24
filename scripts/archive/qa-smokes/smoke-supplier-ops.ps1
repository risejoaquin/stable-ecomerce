param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check-Get($Name, $Url, $Headers) {
  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Headers, $Body) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 10
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Supplier ops summary" "$base/api/admin/supplier-ops/summary" $headers
Check-Get "Suppliers" "$base/api/admin/supplier-ops/suppliers" $headers
Check-Get "Supplier catalog" "$base/api/admin/supplier-ops/supplier-catalog" $headers
Check-Get "Purchase orders" "$base/api/admin/supplier-ops/purchase-orders" $headers
Check-Get "Inventory planning" "$base/api/admin/supplier-ops/inventory-planning" $headers
Check-Get "Replenishment suggestions" "$base/api/admin/supplier-ops/replenishment-suggestions" $headers
Check-Get "Lead times" "$base/api/admin/supplier-ops/lead-times" $headers
Check-Get "Margins" "$base/api/admin/supplier-ops/margins" $headers
Check-Get "Stock alerts" "$base/api/admin/supplier-ops/stock-alerts" $headers
Check-Get "Supplier dashboard" "$base/api/admin/supplier-ops/dashboard" $headers

Check-Post "Create supplier" "$base/api/admin/supplier-ops/suppliers" $headers @{
  name = "Smoke Supplier PL13"
  supplierKey = "smoke_supplier_pl13"
  leadTimeDays = 7
  minimumOrderAmount = 0
  paymentTerms = "manual"
}

Check-Post "Create purchase order" "$base/api/admin/supplier-ops/purchase-orders" $headers @{
  poNumber = "SMOKE-PL13-$(Get-Date -Format yyyyMMddHHmmss)"
  quantity = 1
  unitCost = 0
  notes = "PL13 smoke purchase order"
}

Check-Post "Run replenishment suggestions" "$base/api/admin/supplier-ops/replenishment-suggestions/run" $headers @{
  source = "smoke-supplier-ops"
}

Check-Post "Run stock alerts" "$base/api/admin/supplier-ops/stock-alerts/run" $headers @{
  source = "smoke-supplier-ops"
}

Check-Get "Admin diagnostics" "$base/api/admin/diagnostics" $headers

Write-Host "PASS supplier ops smoke checks"
