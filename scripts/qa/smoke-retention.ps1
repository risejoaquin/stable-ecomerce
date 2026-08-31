param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')

function Check-Get($Name, $Url, $Headers = $null) {
  Write-Host "Checking ${Name}: $Url"
  if ($Headers) {
    $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -UseBasicParsing
  } else {
    $response = Invoke-WebRequest -Method Get -Uri $Url -UseBasicParsing
  }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with status $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Body, $Headers = $null) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 8
  if ($Headers) {
    $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  } else {
    $response = Invoke-WebRequest -Method Post -Uri $Url -ContentType "application/json" -Body $json -UseBasicParsing
  }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with status $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

Check-Get "Public support" "$BaseUrl/api/public/support"
Check-Get "Public content pages" "$BaseUrl/api/public/content/pages"
Check-Get "Public policies" "$BaseUrl/api/public/policies"
Check-Get "Contact page" "$BaseUrl/contact"

$testEmail = "qa+selfcare-retention-$(Get-Date -Format yyyyMMddHHmmss)@example.com"
Check-Post "Newsletter subscribe" "$BaseUrl/api/newsletter/subscribe" @{ email = $testEmail; fullName = "QA Retention"; source = "smoke-retention"; tags = @("qa", "newsletter") }
Check-Post "Support message" "$BaseUrl/api/support/messages" @{ name = "QA Retention"; email = $testEmail; subject = "Smoke support message"; message = "Smoke test support message for POST-LAUNCH 04 retention."; source = "smoke-retention" }
Check-Post "Abandoned cart capture" "$BaseUrl/api/retention/abandoned-cart" @{ email = $testEmail; cartTotal = 12; source = "smoke-retention"; items = @(@{ productId = "qa"; name = "QA item"; quantity = 1; price = 12 }) }

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Admin retention summary" "$BaseUrl/api/admin/retention/summary" $headers
Check-Get "Admin newsletter subscribers" "$BaseUrl/api/admin/newsletter/subscribers" $headers
Check-Get "Admin lifecycle events" "$BaseUrl/api/admin/lifecycle/events" $headers
Check-Get "Admin email events" "$BaseUrl/api/admin/email/events" $headers
Check-Get "Admin support messages" "$BaseUrl/api/admin/support/messages" $headers
Check-Get "Admin diagnostics" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS retention smoke checks"
