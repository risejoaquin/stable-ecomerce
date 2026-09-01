param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"

function Invoke-Check {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body = $null
  )
  Write-Host "Checking ${Name}: $Url"
  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 10
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  } else {
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
  }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "$Name failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }
$headers = @{ Authorization = "Bearer $token" }

Invoke-Check "UX/UI summary" "Get" "$BaseUrl/api/admin/ux-ui/summary" $headers
Invoke-Check "UX/UI audit" "Get" "$BaseUrl/api/admin/ux-ui/audit" $headers
Invoke-Check "Run UX/UI audit" "Post" "$BaseUrl/api/admin/ux-ui/audit/run" $headers @{ runKey="smoke-ux-ui-audit" }
Invoke-Check "Customer journey" "Get" "$BaseUrl/api/admin/ux-ui/customer-journey" $headers
Invoke-Check "Run customer journey" "Post" "$BaseUrl/api/admin/ux-ui/customer-journey/run" $headers @{ runKey="smoke-customer-journey" }
Invoke-Check "Admin journey" "Get" "$BaseUrl/api/admin/ux-ui/admin-journey" $headers
Invoke-Check "Run admin journey" "Post" "$BaseUrl/api/admin/ux-ui/admin-journey/run" $headers @{ runKey="smoke-admin-journey" }
Invoke-Check "Frontend polish" "Get" "$BaseUrl/api/admin/ux-ui/frontend-polish" $headers
Invoke-Check "Run frontend polish" "Post" "$BaseUrl/api/admin/ux-ui/frontend-polish/run" $headers @{ runKey="smoke-frontend-polish" }
Invoke-Check "Mobile UX" "Get" "$BaseUrl/api/admin/ux-ui/mobile" $headers
Invoke-Check "Run mobile UX" "Post" "$BaseUrl/api/admin/ux-ui/mobile/run" $headers @{ runKey="smoke-mobile-ux" }
Invoke-Check "Checkout UX" "Get" "$BaseUrl/api/admin/ux-ui/checkout" $headers
Invoke-Check "Run checkout UX" "Post" "$BaseUrl/api/admin/ux-ui/checkout/run" $headers @{ runKey="smoke-checkout-ux" }
Invoke-Check "Accessibility" "Get" "$BaseUrl/api/admin/ux-ui/accessibility" $headers
Invoke-Check "Run accessibility" "Post" "$BaseUrl/api/admin/ux-ui/accessibility/run" $headers @{ runKey="smoke-accessibility" }
Invoke-Check "Conversion trust" "Get" "$BaseUrl/api/admin/ux-ui/conversion-trust" $headers
Invoke-Check "Run conversion trust" "Post" "$BaseUrl/api/admin/ux-ui/conversion-trust/run" $headers @{ runKey="smoke-conversion-trust" }
Invoke-Check "Visual regression" "Get" "$BaseUrl/api/admin/ux-ui/visual-regression" $headers
Invoke-Check "Run visual regression" "Post" "$BaseUrl/api/admin/ux-ui/visual-regression/run" $headers @{ runKey="smoke-visual-regression" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS UX/UI journey smoke checks"
