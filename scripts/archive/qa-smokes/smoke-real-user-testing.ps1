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

Invoke-Check "Real user summary" "Get" "$BaseUrl/api/admin/real-user-testing/summary" $headers
Invoke-Check "Real user test runs" "Get" "$BaseUrl/api/admin/real-user-testing/test-runs" $headers
Invoke-Check "Run real user test" "Post" "$BaseUrl/api/admin/real-user-testing/test-runs/run" $headers @{ runKey="smoke-real-user-run"; totalUsers=5; completedUsers=5 }
Invoke-Check "Real user feedback" "Get" "$BaseUrl/api/admin/real-user-testing/feedback" $headers
Invoke-Check "Create real user feedback" "Post" "$BaseUrl/api/admin/real-user-testing/feedback" $headers @{ feedbackKey="smoke-feedback"; journeyStep="checkout"; comment="Smoke feedback item" }
Invoke-Check "Conversion QA" "Get" "$BaseUrl/api/admin/real-user-testing/conversion-qa" $headers
Invoke-Check "Run conversion QA" "Post" "$BaseUrl/api/admin/real-user-testing/conversion-qa/run" $headers @{ runKey="smoke-conversion-qa" }
Invoke-Check "Behavior events" "Get" "$BaseUrl/api/admin/real-user-testing/behavior-events" $headers
Invoke-Check "Create behavior event" "Post" "$BaseUrl/api/admin/real-user-testing/behavior-events" $headers @{ eventKey="smoke-behavior-event"; journeyStep="product_detail"; deviceType="mobile" }
Invoke-Check "Abandonment analysis" "Get" "$BaseUrl/api/admin/real-user-testing/abandonment" $headers
Invoke-Check "Run abandonment analysis" "Post" "$BaseUrl/api/admin/real-user-testing/abandonment/run" $headers @{ runKey="smoke-abandonment" }
Invoke-Check "Mobile real validation" "Get" "$BaseUrl/api/admin/real-user-testing/mobile-validation" $headers
Invoke-Check "Run mobile real validation" "Post" "$BaseUrl/api/admin/real-user-testing/mobile-validation/run" $headers @{ runKey="smoke-mobile-real" }
Invoke-Check "Checkout real validation" "Get" "$BaseUrl/api/admin/real-user-testing/checkout-validation" $headers
Invoke-Check "Run checkout real validation" "Post" "$BaseUrl/api/admin/real-user-testing/checkout-validation/run" $headers @{ runKey="smoke-checkout-real" }
Invoke-Check "Friction priorities" "Get" "$BaseUrl/api/admin/real-user-testing/friction-priorities" $headers
Invoke-Check "Run friction priorities" "Post" "$BaseUrl/api/admin/real-user-testing/friction-priorities/run" $headers @{ runKey="smoke-friction-priorities" }
Invoke-Check "Session markers" "Get" "$BaseUrl/api/admin/real-user-testing/session-markers" $headers
Invoke-Check "Create session marker" "Post" "$BaseUrl/api/admin/real-user-testing/session-markers" $headers @{ markerKey="smoke-session-marker"; journeyStep="checkout" }
Invoke-Check "Feedback loop" "Get" "$BaseUrl/api/admin/real-user-testing/feedback-loop" $headers
Invoke-Check "Run feedback loop" "Post" "$BaseUrl/api/admin/real-user-testing/feedback-loop/run" $headers @{ runKey="smoke-feedback-loop" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS real user testing smoke checks"
