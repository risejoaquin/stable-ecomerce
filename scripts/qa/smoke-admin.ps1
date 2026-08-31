param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/api/login" -Method POST -ContentType "application/json" -Body $loginBody
if (-not $login.token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $($login.token)" }

$checks = @(
  "/api/admin/diagnostics",
  "/api/admin/diagnostics/stripe",
  "/api/admin/diagnostics/supabase",
  "/api/admin/diagnostics/orders",
  "/api/admin/diagnostics/security",
  "/api/admin/orders",
  "/api/admin/operations/summary",
  "/api/admin/stripe-events",
  "/api/admin/inventory/movements"
)

foreach ($path in $checks) {
  $uri = "$base$path"
  Write-Host "Checking admin: $uri"
  $response = Invoke-WebRequest -Uri $uri -Method GET -Headers $headers -UseBasicParsing -TimeoutSec 30
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
    throw "$path failed with status $($response.StatusCode)"
  }
  Write-Host "PASS $path -> $($response.StatusCode)"
}

Write-Host "PASS admin smoke checks"
