param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check-Public($Name, $Path) {
  $url = "$base$Path"
  Write-Host "Checking ${Name}: $url"
  $res = Invoke-WebRequest -Method Get -Uri $url -UseBasicParsing
  if ($res.StatusCode -ne 200) { throw "$Name failed with $($res.StatusCode)" }
  Write-Host "PASS $Name -> $($res.StatusCode)"
}

Check-Public "Public Policies" "/api/public/policies"
Check-Public "Home" "/"

$body = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $body
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }
$headers = @{ Authorization = "Bearer $token" }

$paths = @(
  "/api/admin/commercial/summary",
  "/api/admin/product-readiness",
  "/api/admin/campaigns",
  "/api/admin/reviews",
  "/api/admin/diagnostics"
)

foreach ($path in $paths) {
  $url = "$base$path"
  Write-Host "Checking admin commercial: $url"
  $res = Invoke-WebRequest -Method Get -Uri $url -Headers $headers -UseBasicParsing
  if ($res.StatusCode -ne 200) { throw "$path failed with $($res.StatusCode)" }
  Write-Host "PASS $path -> $($res.StatusCode)"
}

Write-Host "PASS commercial smoke checks"
