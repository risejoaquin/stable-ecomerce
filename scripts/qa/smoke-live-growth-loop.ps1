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

Invoke-Check "Live growth summary" "Get" "$BaseUrl/api/admin/live-growth-loop/summary" $headers
Invoke-Check "Live operations" "Get" "$BaseUrl/api/admin/live-growth-loop/live-operations" $headers
Invoke-Check "Run live operations" "Post" "$BaseUrl/api/admin/live-growth-loop/live-operations/run" $headers @{ snapshotKey="smoke-live-operations" }
Invoke-Check "Real sales" "Get" "$BaseUrl/api/admin/live-growth-loop/real-sales" $headers
Invoke-Check "Run real sales" "Post" "$BaseUrl/api/admin/live-growth-loop/real-sales/run" $headers @{ measurementKey="smoke-real-sales" }
Invoke-Check "Channel behavior" "Get" "$BaseUrl/api/admin/live-growth-loop/channel-behavior" $headers
Invoke-Check "Run channel behavior" "Post" "$BaseUrl/api/admin/live-growth-loop/channel-behavior/run" $headers @{ analyticsKey="smoke-channel-behavior" }
Invoke-Check "Conversion experiments" "Get" "$BaseUrl/api/admin/live-growth-loop/conversion-experiments" $headers
Invoke-Check "Run conversion experiments" "Post" "$BaseUrl/api/admin/live-growth-loop/conversion-experiments/run" $headers @{ experimentKey="smoke-conversion-experiment" }
Invoke-Check "AB priorities" "Get" "$BaseUrl/api/admin/live-growth-loop/ab-priorities" $headers
Invoke-Check "Run AB priorities" "Post" "$BaseUrl/api/admin/live-growth-loop/ab-priorities/run" $headers @{ priorityKey="smoke-ab-priority" }
Invoke-Check "Bottlenecks" "Get" "$BaseUrl/api/admin/live-growth-loop/bottlenecks" $headers
Invoke-Check "Run bottlenecks" "Post" "$BaseUrl/api/admin/live-growth-loop/bottlenecks/run" $headers @{ reportKey="smoke-bottleneck" }
Invoke-Check "Campaign iterations" "Get" "$BaseUrl/api/admin/live-growth-loop/campaign-iterations" $headers
Invoke-Check "Run campaign iterations" "Post" "$BaseUrl/api/admin/live-growth-loop/campaign-iterations/run" $headers @{ iterationKey="smoke-campaign-iteration" }
Invoke-Check "Risk cost control" "Get" "$BaseUrl/api/admin/live-growth-loop/risk-cost-control" $headers
Invoke-Check "Run risk cost control" "Post" "$BaseUrl/api/admin/live-growth-loop/risk-cost-control/run" $headers @{ snapshotKey="smoke-risk-cost-control" }
Invoke-Check "Growth loop" "Get" "$BaseUrl/api/admin/live-growth-loop/actions" $headers
Invoke-Check "Run growth loop" "Post" "$BaseUrl/api/admin/live-growth-loop/actions/run" $headers @{ actionKey="smoke-growth-loop-action" }
Invoke-Check "Improvement reports" "Get" "$BaseUrl/api/admin/live-growth-loop/improvement-reports" $headers
Invoke-Check "Run improvement reports" "Post" "$BaseUrl/api/admin/live-growth-loop/improvement-reports/run" $headers @{ reportKey="smoke-improvement-report" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS live growth loop smoke checks"
