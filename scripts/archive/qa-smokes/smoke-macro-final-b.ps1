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

Invoke-Check "Macro final B summary" "Get" "$BaseUrl/api/admin/macro-final-b/summary" $headers
Invoke-Check "Internationalization locales" "Get" "$BaseUrl/api/admin/macro-final-b/locales" $headers
Invoke-Check "Run internationalization locales" "Post" "$BaseUrl/api/admin/macro-final-b/locales/run" $headers @{ localeKey="es-MX" }
Invoke-Check "Multi currency" "Get" "$BaseUrl/api/admin/macro-final-b/currencies" $headers
Invoke-Check "Run multi currency" "Post" "$BaseUrl/api/admin/macro-final-b/currencies/run" $headers @{ currencyKey="mxn-baseline" }
Invoke-Check "Tax legal readiness" "Get" "$BaseUrl/api/admin/macro-final-b/tax-legal" $headers
Invoke-Check "Run tax legal readiness" "Post" "$BaseUrl/api/admin/macro-final-b/tax-legal/run" $headers @{ checkKey="mx-tax-legal-readiness" }
Invoke-Check "Localized content" "Get" "$BaseUrl/api/admin/macro-final-b/localized-content" $headers
Invoke-Check "Run localized content" "Post" "$BaseUrl/api/admin/macro-final-b/localized-content/run" $headers @{ contentKey="home-hero-es-mx" }
Invoke-Check "Personalization profiles" "Get" "$BaseUrl/api/admin/macro-final-b/personalization-profiles" $headers
Invoke-Check "Run personalization profiles" "Post" "$BaseUrl/api/admin/macro-final-b/personalization-profiles/run" $headers @{ profileKey="smoke-profile" }
Invoke-Check "Recommendation rules" "Get" "$BaseUrl/api/admin/macro-final-b/recommendation-rules" $headers
Invoke-Check "Run recommendation rules" "Post" "$BaseUrl/api/admin/macro-final-b/recommendation-rules/run" $headers @{ ruleKey="smoke-recommendation-rule" }
Invoke-Check "Recommendation events" "Get" "$BaseUrl/api/admin/macro-final-b/recommendation-events" $headers
Invoke-Check "Create recommendation event" "Post" "$BaseUrl/api/admin/macro-final-b/recommendation-events" $headers @{ eventKey="smoke-recommendation-event"; ruleKey="smoke-recommendation-rule" }
Invoke-Check "CDP profiles" "Get" "$BaseUrl/api/admin/macro-final-b/cdp-profiles" $headers
Invoke-Check "Run CDP profiles" "Post" "$BaseUrl/api/admin/macro-final-b/cdp-profiles/run" $headers @{ profileKey="smoke-cdp-profile" }
Invoke-Check "CDP segments" "Get" "$BaseUrl/api/admin/macro-final-b/cdp-segments" $headers
Invoke-Check "Run CDP segments" "Post" "$BaseUrl/api/admin/macro-final-b/cdp-segments/run" $headers @{ membershipKey="smoke-cdp-membership" }
Invoke-Check "Scale governance freeze" "Get" "$BaseUrl/api/admin/macro-final-b/scale-freeze" $headers
Invoke-Check "Run scale governance freeze" "Post" "$BaseUrl/api/admin/macro-final-b/scale-freeze/run" $headers @{ freezeKey="smoke-scale-freeze" }
Invoke-Check "Maintenance controls" "Get" "$BaseUrl/api/admin/macro-final-b/maintenance-controls" $headers
Invoke-Check "Run maintenance controls" "Post" "$BaseUrl/api/admin/macro-final-b/maintenance-controls/run" $headers @{ controlKey="smoke-maintenance-control" }
Invoke-Check "Product v2 roadmap" "Get" "$BaseUrl/api/admin/macro-final-b/product-v2-roadmap" $headers
Invoke-Check "Create product v2 roadmap" "Post" "$BaseUrl/api/admin/macro-final-b/product-v2-roadmap" $headers @{ roadmapKey="smoke-product-v2"; title="Product v2 smoke roadmap item" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS macro final B smoke checks"
