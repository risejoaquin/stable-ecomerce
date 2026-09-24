param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$Password
)
$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Check-Get($Name, $Url, $Headers) {
  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Method Get -Uri $Url -Headers $Headers -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

function Check-Post($Name, $Url, $Headers, $Body) {
  Write-Host "Checking ${Name}: $Url"
  $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10) -UseBasicParsing
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "${Name} failed with $($response.StatusCode)" }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token" }
$headers = @{ Authorization = "Bearer $token" }

Check-Get "Scale summary" "$base/api/admin/scale/summary" $headers
Check-Get "Work queues" "$base/api/admin/scale/work-queues" $headers
Check-Get "Assignments" "$base/api/admin/scale/assignments" $headers
Check-Get "Roles" "$base/api/admin/scale/roles" $headers
Check-Get "Permissions" "$base/api/admin/scale/permissions" $headers
Check-Get "Advanced dashboard" "$base/api/admin/scale/dashboard" $headers
Check-Get "Notifications" "$base/api/admin/scale/notifications" $headers
Check-Get "Advanced audit" "$base/api/admin/scale/audit" $headers
Check-Get "Bulk actions" "$base/api/admin/scale/bulk-actions" $headers
Check-Post "Create work queue" "$base/api/admin/scale/work-queues" $headers @{ name = "Smoke Operations Queue"; queueType = "operations"; priority = "normal" }
Check-Post "Create assignment" "$base/api/admin/scale/assignments" $headers @{ title = "Smoke assignment"; taskType = "follow_up"; entityType = "order"; priority = "normal" }
Check-Post "Create notification" "$base/api/admin/scale/notifications" $headers @{ title = "Smoke notification"; message = "Scale admin smoke notification"; notificationType = "internal" }
Check-Post "Run bulk action" "$base/api/admin/scale/bulk-actions/run" $headers @{ actionType = "catalog_ready_review"; targetCount = 1 }
Check-Get "Admin diagnostics" "$base/api/admin/diagnostics" $headers

Write-Host "PASS scale admin smoke checks"
