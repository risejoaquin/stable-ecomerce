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

Invoke-Check "Brand system summary" "Get" "$BaseUrl/api/admin/brand-system/summary" $headers
Invoke-Check "Brand identity" "Get" "$BaseUrl/api/admin/brand-system/identity" $headers
Invoke-Check "Run brand identity" "Post" "$BaseUrl/api/admin/brand-system/identity/run" $headers @{ runKey="smoke-brand-identity" }
Invoke-Check "Design system" "Get" "$BaseUrl/api/admin/brand-system/design-system" $headers
Invoke-Check "Run design system" "Post" "$BaseUrl/api/admin/brand-system/design-system/run" $headers @{ runKey="smoke-design-system" }
Invoke-Check "Component standards" "Get" "$BaseUrl/api/admin/brand-system/components" $headers
Invoke-Check "Run component standards" "Post" "$BaseUrl/api/admin/brand-system/components/run" $headers @{ runKey="smoke-components" }
Invoke-Check "Commercial content" "Get" "$BaseUrl/api/admin/brand-system/content" $headers
Invoke-Check "Run commercial content" "Post" "$BaseUrl/api/admin/brand-system/content/run" $headers @{ runKey="smoke-content" }
Invoke-Check "Visual consistency" "Get" "$BaseUrl/api/admin/brand-system/visual-consistency" $headers
Invoke-Check "Run visual consistency" "Post" "$BaseUrl/api/admin/brand-system/visual-consistency/run" $headers @{ runKey="smoke-visual-consistency" }
Invoke-Check "Campaign assets" "Get" "$BaseUrl/api/admin/brand-system/campaign-assets" $headers
Invoke-Check "Run campaign assets" "Post" "$BaseUrl/api/admin/brand-system/campaign-assets/run" $headers @{ runKey="smoke-campaign-assets" }
Invoke-Check "Microcopy" "Get" "$BaseUrl/api/admin/brand-system/microcopy" $headers
Invoke-Check "Run microcopy" "Post" "$BaseUrl/api/admin/brand-system/microcopy/run" $headers @{ runKey="smoke-microcopy" }
Invoke-Check "UI standards" "Get" "$BaseUrl/api/admin/brand-system/ui-standards" $headers
Invoke-Check "Run UI standards" "Post" "$BaseUrl/api/admin/brand-system/ui-standards/run" $headers @{ runKey="smoke-ui-standards" }
Invoke-Check "Product content" "Get" "$BaseUrl/api/admin/brand-system/product-content" $headers
Invoke-Check "Run product content" "Post" "$BaseUrl/api/admin/brand-system/product-content/run" $headers @{ runKey="smoke-product-content" }
Invoke-Check "Brand readiness" "Get" "$BaseUrl/api/admin/brand-system/brand-readiness" $headers
Invoke-Check "Run brand readiness" "Post" "$BaseUrl/api/admin/brand-system/brand-readiness/run" $headers @{ reportKey="smoke-brand-readiness" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS brand system smoke checks"
