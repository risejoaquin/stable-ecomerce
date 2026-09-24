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
  if ($response.StatusCode -lt 200 -or $response.StatusCode -gt 299) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Body, $Headers = @{}) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 20
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -gt 299) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Public merchandising home" "$BaseUrl/api/public/merchandising/home"
Check-Get "Public product feed" "$BaseUrl/api/public/product-feed"
Check-Get "Admin catalog template" "$BaseUrl/api/admin/catalog/import-template" $headers
Check-Get "Admin catalog QA" "$BaseUrl/api/admin/catalog/qa" $headers
Check-Get "Admin merchandising summary" "$BaseUrl/api/admin/merchandising/summary" $headers
Check-Get "Admin media assets" "$BaseUrl/api/admin/media/assets" $headers
Check-Get "Admin product readiness" "$BaseUrl/api/admin/product-readiness" $headers
Check-Get "Admin paid traffic feed" "$BaseUrl/api/admin/paid-traffic/feed" $headers
Check-Get "Admin diagnostics" "$BaseUrl/api/admin/diagnostics" $headers

$validateBody = @{
  products = @(
    @{
      name = "Smoke Catalog Test Product"
      price = 199
      cost = 90
      stock = 5
      category = "Smoke QA"
      image_url = "https://selfcaresinners.com/logo.png"
      image_alt_text = "Smoke catalog product"
      seo_title = "Smoke Catalog Test Product | Selfcare Sinners"
      seo_description = "Producto de prueba para validación de catálogo."
      status = "draft"
    }
  )
}
Check-Post "Catalog validate import" "$BaseUrl/api/admin/catalog/validate-import" $validateBody $headers

$ruleBody = @{
  title = "Smoke merchandising rule"
  ruleKey = "smoke-merchandising-rule"
  priority = 99
  conditions = @{ source = "smoke" }
  actions = @{ sort = "priority" }
  is_active = $true
}
Check-Post "Merchandising rule upsert" "$BaseUrl/api/admin/merchandising/rules" $ruleBody $headers

Write-Host "PASS catalog sales enablement smoke checks"
