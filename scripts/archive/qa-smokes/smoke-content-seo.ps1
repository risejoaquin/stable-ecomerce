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

Invoke-Check "Content SEO summary" "Get" "$BaseUrl/api/admin/content-seo/summary" $headers
Invoke-Check "Production content" "Get" "$BaseUrl/api/admin/content-seo/production-content" $headers
Invoke-Check "Run production content" "Post" "$BaseUrl/api/admin/content-seo/production-content/run" $headers @{ runKey="smoke-production-content" }
Invoke-Check "Landing pages" "Get" "$BaseUrl/api/admin/content-seo/landing-pages" $headers
Invoke-Check "Run landing pages" "Post" "$BaseUrl/api/admin/content-seo/landing-pages/run" $headers @{ runKey="smoke-landing-pages" }
Invoke-Check "SEO depth" "Get" "$BaseUrl/api/admin/content-seo/seo-depth" $headers
Invoke-Check "Run SEO depth" "Post" "$BaseUrl/api/admin/content-seo/seo-depth/run" $headers @{ runKey="smoke-seo-depth" }
Invoke-Check "Search intent" "Get" "$BaseUrl/api/admin/content-seo/search-intent" $headers
Invoke-Check "Run search intent" "Post" "$BaseUrl/api/admin/content-seo/search-intent/run" $headers @{ runKey="smoke-search-intent" }
Invoke-Check "Campaign readiness" "Get" "$BaseUrl/api/admin/content-seo/campaign-readiness" $headers
Invoke-Check "Run campaign readiness" "Post" "$BaseUrl/api/admin/content-seo/campaign-readiness/run" $headers @{ runKey="smoke-campaign-readiness" }
Invoke-Check "Product category copy" "Get" "$BaseUrl/api/admin/content-seo/product-category-copy" $headers
Invoke-Check "Run product category copy" "Post" "$BaseUrl/api/admin/content-seo/product-category-copy/run" $headers @{ runKey="smoke-product-category-copy" }
Invoke-Check "Educational content" "Get" "$BaseUrl/api/admin/content-seo/educational-content" $headers
Invoke-Check "Run educational content" "Post" "$BaseUrl/api/admin/content-seo/educational-content/run" $headers @{ runKey="smoke-educational-content" }
Invoke-Check "Organic readiness" "Get" "$BaseUrl/api/admin/content-seo/organic-readiness" $headers
Invoke-Check "Run organic readiness" "Post" "$BaseUrl/api/admin/content-seo/organic-readiness/run" $headers @{ runKey="smoke-organic-readiness" }
Invoke-Check "Paid readiness" "Get" "$BaseUrl/api/admin/content-seo/paid-readiness" $headers
Invoke-Check "Run paid readiness" "Post" "$BaseUrl/api/admin/content-seo/paid-readiness/run" $headers @{ runKey="smoke-paid-readiness" }
Invoke-Check "Content readiness" "Get" "$BaseUrl/api/admin/content-seo/readiness" $headers
Invoke-Check "Run content readiness" "Post" "$BaseUrl/api/admin/content-seo/readiness/run" $headers @{ reportKey="smoke-content-readiness" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS content SEO smoke checks"
