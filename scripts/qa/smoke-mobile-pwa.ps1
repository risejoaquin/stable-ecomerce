param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check-Get($Name, $Url, $Headers = $null) {
  Write-Host "Checking ${Name}: $Url"
  if ($Headers) { $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -UseBasicParsing }
  else { $response = Invoke-WebRequest -Method Get -Uri $Url -UseBasicParsing }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Headers, $Body) {
  Write-Host "Checking ${Name}: $Url"
  $json = $Body | ConvertTo-Json -Depth 10
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "FAIL ${Name} -> $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Mobile PWA summary" "$base/api/admin/mobile-pwa/summary" $headers
Check-Get "PWA manifest" "$base/site.webmanifest"
Check-Get "Service worker" "$base/sw.js"
Check-Get "Offline catalog" "$base/api/mobile/offline-catalog"
Check-Get "Mobile checkout readiness" "$base/api/admin/mobile-pwa/checkout-readiness" $headers
Check-Get "Web push readiness" "$base/api/admin/mobile-pwa/web-push" $headers
Check-Get "Touch optimization" "$base/api/admin/mobile-pwa/touch-optimization" $headers
Check-Get "Mobile performance" "$base/api/admin/mobile-pwa/performance" $headers
Check-Get "Mobile retention" "$base/api/admin/mobile-pwa/retention" $headers
Check-Get "App readiness" "$base/api/admin/mobile-pwa/app-readiness" $headers

Check-Post "Create install event" "$base/api/mobile/install-event" $headers @{
  eventType = "install_prompt_seen"
  platform = "web"
  displayMode = "standalone"
  accepted = $false
  source = "smoke-mobile-pwa"
}

Check-Post "Create checkout event" "$base/api/mobile/checkout-event" $headers @{
  eventType = "mobile_checkout_started"
  step = "cart"
  success = $true
  durationMs = 250
  source = "smoke-mobile-pwa"
}

Check-Post "Register push subscription" "$base/api/mobile/push-subscription" $headers @{
  endpoint = "https://example.com/push/smoke-pl14"
  p256dh = "smoke-p256dh"
  auth = "smoke-auth"
  permissionStatus = "granted"
}

Check-Post "Run app readiness" "$base/api/admin/mobile-pwa/app-readiness/run" $headers @{
  source = "smoke-mobile-pwa"
}

Check-Get "Admin diagnostics" "$base/api/admin/diagnostics" $headers

Write-Host "PASS mobile PWA smoke checks"
