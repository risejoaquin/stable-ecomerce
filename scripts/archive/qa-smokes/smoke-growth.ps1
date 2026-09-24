param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')

function Check-Public($Name, $Path) {
  $url = "$base$Path"
  Write-Host "Checking ${Name}: $url"
  $response = Invoke-WebRequest -Method Get -Uri $url -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    throw "FAIL ${Name} -> $($response.StatusCode)"
  }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Admin($Token, $Path) {
  $url = "$base$Path"
  Write-Host "Checking admin growth: $url"
  $response = Invoke-WebRequest -Method Get -Uri $url -Headers @{ Authorization = "Bearer $Token" } -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    throw "FAIL $Path -> $($response.StatusCode)"
  }
  Write-Host "PASS $Path -> $($response.StatusCode)"
}

Check-Public "Public Home Payload" "/api/public/home"
Check-Public "Public Categories" "/api/public/categories"
Check-Public "SEO Products" "/api/seo/products"
Check-Public "Home" "/"

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return a token" }

Check-Admin $token "/api/admin/commercial/summary"
Check-Admin $token "/api/admin/conversion/summary"
Check-Admin $token "/api/admin/product-readiness"
Check-Admin $token "/api/admin/catalog/export-template"
Check-Admin $token "/api/admin/diagnostics"

Write-Host "PASS growth smoke checks"
