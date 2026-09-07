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

Invoke-Check "Executive BI summary" "Get" "$BaseUrl/api/admin/executive-bi/summary" $headers
Invoke-Check "Executive KPIs" "Get" "$BaseUrl/api/admin/executive-bi/executive-kpis" $headers
Invoke-Check "Run executive KPIs" "Post" "$BaseUrl/api/admin/executive-bi/executive-kpis/run" $headers @{ snapshotKey="smoke-executive-kpis" }
Invoke-Check "Command center" "Get" "$BaseUrl/api/admin/executive-bi/command-center" $headers
Invoke-Check "Run command center" "Post" "$BaseUrl/api/admin/executive-bi/command-center/run" $headers @{ reportKey="smoke-command-center" }
Invoke-Check "Commercial health" "Get" "$BaseUrl/api/admin/executive-bi/commercial-health" $headers
Invoke-Check "Run commercial health" "Post" "$BaseUrl/api/admin/executive-bi/commercial-health/run" $headers @{ checkKey="smoke-commercial-health" }
Invoke-Check "Technical health" "Get" "$BaseUrl/api/admin/executive-bi/technical-health" $headers
Invoke-Check "Run technical health" "Post" "$BaseUrl/api/admin/executive-bi/technical-health/run" $headers @{ checkKey="smoke-technical-health" }
Invoke-Check "Funnel analytics" "Get" "$BaseUrl/api/admin/executive-bi/funnel-analytics" $headers
Invoke-Check "Run funnel analytics" "Post" "$BaseUrl/api/admin/executive-bi/funnel-analytics/run" $headers @{ snapshotKey="smoke-funnel-analytics" }
Invoke-Check "Channel campaign comparison" "Get" "$BaseUrl/api/admin/executive-bi/channel-campaign-comparison" $headers
Invoke-Check "Run channel campaign comparison" "Post" "$BaseUrl/api/admin/executive-bi/channel-campaign-comparison/run" $headers @{ reportKey="smoke-channel-comparison" }
Invoke-Check "Decision priorities" "Get" "$BaseUrl/api/admin/executive-bi/decision-priorities" $headers
Invoke-Check "Run decision priorities" "Post" "$BaseUrl/api/admin/executive-bi/decision-priorities/run" $headers @{ priorityKey="smoke-decision-priority" }
Invoke-Check "Investor reporting" "Get" "$BaseUrl/api/admin/executive-bi/investor-reporting" $headers
Invoke-Check "Run investor reporting" "Post" "$BaseUrl/api/admin/executive-bi/investor-reporting/run" $headers @{ packetKey="smoke-investor-reporting" }
Invoke-Check "BI insights" "Get" "$BaseUrl/api/admin/executive-bi/bi-insights" $headers
Invoke-Check "Run BI insights" "Post" "$BaseUrl/api/admin/executive-bi/bi-insights/run" $headers @{ insightKey="smoke-bi-insight" }
Invoke-Check "Operating system reviews" "Get" "$BaseUrl/api/admin/executive-bi/operating-system-reviews" $headers
Invoke-Check "Run operating system reviews" "Post" "$BaseUrl/api/admin/executive-bi/operating-system-reviews/run" $headers @{ runKey="smoke-operating-system-review" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS executive BI smoke checks"
