param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"

function Check($Name, $Method, $Url, $Headers = @{}, $Body = $null) {
  Write-Host "Checking ${Name}: ${Url}"
  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 10
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  } else {
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
  }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -gt 299) { throw "${Name} failed with status $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$BaseUrl = $BaseUrl.TrimEnd('/')

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }

$headers = @{ Authorization = "Bearer $token" }

Check "Smart search" "Get" "$BaseUrl/api/search/smart?q=crema%20hidratante&intent=hydration"
Check "Commerce assistant message" "Post" "$BaseUrl/api/ai/commerce-assistant/message" @{} @{ message = "Necesito una crema hidratante para piel sensible"; sessionId = "smoke-ai-commerce"; customerEmail = "smoke-ai@selfcaresinners.com" }
Check "Product discovery" "Get" "$BaseUrl/api/ai/product-discovery?q=piel%20sensible"
Check "FAQ assisted" "Get" "$BaseUrl/api/ai/faq?q=envio"
Check "Intent score" "Post" "$BaseUrl/api/ai/intent-score" @{} @{ query = "quiero comprar crema hidratante"; source = "smoke" }
Check "Skincare synonyms" "Get" "$BaseUrl/api/ai/skincare-synonyms"

Check "AI commerce summary" "Get" "$BaseUrl/api/admin/ai-commerce/summary" $headers
Check "Search insights" "Get" "$BaseUrl/api/admin/ai-commerce/search-insights" $headers
Check "Assistant sessions" "Get" "$BaseUrl/api/admin/ai-commerce/assistant-sessions" $headers
Check "Discovery insights" "Get" "$BaseUrl/api/admin/ai-commerce/product-discovery" $headers
Check "FAQ insights" "Get" "$BaseUrl/api/admin/ai-commerce/faq-insights" $headers
Check "Create synonym" "Post" "$BaseUrl/api/admin/ai-commerce/synonyms" $headers @{ term = "anti manchas"; synonyms = @("manchas", "tono desigual", "hiperpigmentación"); category = "skincare" }
Check "Create FAQ" "Post" "$BaseUrl/api/admin/ai-commerce/faq" $headers @{ question = "¿El asistente reemplaza una consulta médica?"; answer = "No. El asistente solo guía compra y descubrimiento de productos. Para condiciones médicas consulta a un profesional."; topic = "safety"; keywords = @("médico", "seguridad", "consulta") }
Check "Run recommendations" "Post" "$BaseUrl/api/admin/ai-commerce/recommendations/run" $headers @{ query = "crema para piel seca"; source = "smoke" }
Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS AI commerce smoke checks"
