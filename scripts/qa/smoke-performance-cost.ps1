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

Invoke-Check "Performance summary" "Get" "$BaseUrl/api/admin/performance/summary" $headers
Invoke-Check "Load tests" "Get" "$BaseUrl/api/admin/performance/load-tests" $headers
Invoke-Check "Run load test" "Post" "$BaseUrl/api/admin/performance/load-tests/run" $headers @{ runKey="smoke-load-test"; concurrentUsers=2; durationSeconds=30 }
Invoke-Check "Endpoint performance" "Get" "$BaseUrl/api/admin/performance/endpoints" $headers
Invoke-Check "Query profiles" "Get" "$BaseUrl/api/admin/performance/query-profiles" $headers
Invoke-Check "Run query profiling" "Post" "$BaseUrl/api/admin/performance/query-profiles/run" $headers @{ runKey="smoke-query-profile" }
Invoke-Check "Slow queries" "Get" "$BaseUrl/api/admin/performance/slow-queries" $headers
Invoke-Check "Cache metrics" "Get" "$BaseUrl/api/admin/performance/cache" $headers
Invoke-Check "Analyze cache" "Post" "$BaseUrl/api/admin/performance/cache/analyze" $headers @{ runKey="smoke-cache" }
Invoke-Check "Cost snapshots" "Get" "$BaseUrl/api/admin/performance/costs" $headers
Invoke-Check "Create cost snapshot" "Post" "$BaseUrl/api/admin/performance/costs/snapshot" $headers @{ snapshotKey="smoke-cost-snapshot"; monthlyEstimate=0 }
Invoke-Check "Resource alerts" "Get" "$BaseUrl/api/admin/performance/resource-alerts" $headers
Invoke-Check "Run resource alerts" "Post" "$BaseUrl/api/admin/performance/resource-alerts/run" $headers @{ runKey="smoke-resource-alerts" }
Invoke-Check "Optimization checks" "Get" "$BaseUrl/api/admin/performance/optimization-checks" $headers
Invoke-Check "Run optimization checks" "Post" "$BaseUrl/api/admin/performance/optimization-checks/run" $headers @{ runKey="smoke-optimization" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS performance cost smoke checks"
