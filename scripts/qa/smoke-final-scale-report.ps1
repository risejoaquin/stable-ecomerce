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

Invoke-Check "Final scale summary" "Get" "$BaseUrl/api/admin/final-scale/summary" $headers
Invoke-Check "Technical assessment" "Get" "$BaseUrl/api/admin/final-scale/technical-assessment" $headers
Invoke-Check "Run technical assessment" "Post" "$BaseUrl/api/admin/final-scale/technical-assessment/run" $headers @{ runKey="smoke-technical" }
Invoke-Check "Commercial assessment" "Get" "$BaseUrl/api/admin/final-scale/commercial-assessment" $headers
Invoke-Check "Run commercial assessment" "Post" "$BaseUrl/api/admin/final-scale/commercial-assessment/run" $headers @{ runKey="smoke-commercial" }
Invoke-Check "Risk matrix" "Get" "$BaseUrl/api/admin/final-scale/risk-matrix" $headers
Invoke-Check "Run risk matrix" "Post" "$BaseUrl/api/admin/final-scale/risk-matrix/run" $headers @{ runKey="smoke-risk" }
Invoke-Check "Technical debt" "Get" "$BaseUrl/api/admin/final-scale/technical-debt" $headers
Invoke-Check "Run technical debt" "Post" "$BaseUrl/api/admin/final-scale/technical-debt/run" $headers @{ runKey="smoke-debt" }
Invoke-Check "Operating costs" "Get" "$BaseUrl/api/admin/final-scale/operating-costs" $headers
Invoke-Check "Run operating costs" "Post" "$BaseUrl/api/admin/final-scale/operating-costs/run" $headers @{ runKey="smoke-costs" }
Invoke-Check "Scale capacity" "Get" "$BaseUrl/api/admin/final-scale/capacity" $headers
Invoke-Check "Run scale capacity" "Post" "$BaseUrl/api/admin/final-scale/capacity/run" $headers @{ runKey="smoke-capacity" }
Invoke-Check "Strategic roadmap" "Get" "$BaseUrl/api/admin/final-scale/strategic-roadmap" $headers
Invoke-Check "Create strategic roadmap item" "Post" "$BaseUrl/api/admin/final-scale/strategic-roadmap" $headers @{ roadmapKey="smoke-roadmap-item"; phase="Roadmap 2.0"; title="Smoke roadmap item"; objective="Validate strategic roadmap creation"; priority="low" }
Invoke-Check "Scale decision" "Get" "$BaseUrl/api/admin/final-scale/scale-decision" $headers
Invoke-Check "Create scale decision" "Post" "$BaseUrl/api/admin/final-scale/scale-decision" $headers @{ decisionKey="smoke-scale-decision"; decision="scale_carefully"; rationale="Smoke validation decision" }
Invoke-Check "Investor readiness" "Get" "$BaseUrl/api/admin/final-scale/investor-readiness" $headers
Invoke-Check "Run investor readiness" "Post" "$BaseUrl/api/admin/final-scale/investor-readiness/run" $headers @{ runKey="smoke-investor" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS final scale report smoke checks"
