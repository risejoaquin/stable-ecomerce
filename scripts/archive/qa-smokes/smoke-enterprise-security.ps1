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

Invoke-Check "Enterprise security summary" "Get" "$BaseUrl/api/admin/enterprise-security/summary" $headers
Invoke-Check "Security audit events" "Get" "$BaseUrl/api/admin/enterprise-security/audit-events" $headers
Invoke-Check "Admin action trails" "Get" "$BaseUrl/api/admin/enterprise-security/admin-trails" $headers
Invoke-Check "Permission reviews" "Get" "$BaseUrl/api/admin/enterprise-security/permission-reviews" $headers
Invoke-Check "Run permission review" "Post" "$BaseUrl/api/admin/enterprise-security/permission-reviews/run" $headers @{ runKey="smoke-permission-review" }
Invoke-Check "Data retention" "Get" "$BaseUrl/api/admin/enterprise-security/data-retention" $headers
Invoke-Check "Run data retention" "Post" "$BaseUrl/api/admin/enterprise-security/data-retention/run" $headers @{ jobKey="smoke-retention"; dryRun=$true }
Invoke-Check "Compliance exports" "Get" "$BaseUrl/api/admin/enterprise-security/compliance-exports" $headers
Invoke-Check "Create compliance export" "Post" "$BaseUrl/api/admin/enterprise-security/compliance-exports" $headers @{ exportKey="smoke-export"; exportType="audit" }
Invoke-Check "Abuse detection" "Get" "$BaseUrl/api/admin/enterprise-security/abuse-detection" $headers
Invoke-Check "Run abuse detection" "Post" "$BaseUrl/api/admin/enterprise-security/abuse-detection/run" $headers @{ eventKey="smoke-abuse-run" }
Invoke-Check "Sensitive approvals" "Get" "$BaseUrl/api/admin/enterprise-security/sensitive-approvals" $headers
Invoke-Check "Create sensitive approval" "Post" "$BaseUrl/api/admin/enterprise-security/sensitive-approvals" $headers @{ actionKey="smoke-sensitive-action"; actionName="Smoke sensitive action"; reason="Smoke test" }
Invoke-Check "Resolve sensitive approval" "Post" "$BaseUrl/api/admin/enterprise-security/sensitive-approvals/resolve" $headers @{ actionKey="smoke-sensitive-action"; status="approved"; decisionNotes="Smoke approval" }
Invoke-Check "Security hardening" "Get" "$BaseUrl/api/admin/enterprise-security/hardening" $headers
Invoke-Check "Run security hardening" "Post" "$BaseUrl/api/admin/enterprise-security/hardening/run" $headers @{ runKey="smoke-hardening" }
Invoke-Check "Admin diagnostics" "Get" "$BaseUrl/api/admin/diagnostics" $headers

Write-Host "PASS enterprise security smoke checks"
