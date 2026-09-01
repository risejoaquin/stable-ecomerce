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
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )
  Write-Host "Checking ${Name}: $Url"
  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 20
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -UseBasicParsing
  } else {
    $response = Invoke-WebRequest -Method $Method -Uri $Url -Headers $Headers -UseBasicParsing
  }
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    throw "FAIL ${Name} -> $($response.StatusCode)"
  }
  Write-Host "PASS ${Name} -> $($response.StatusCode)"
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login did not return token/accessToken" }

$headers = @{ Authorization = "Bearer $token" }

Invoke-Check -Name "CRM summary" -Method Get -Url "$BaseUrl/api/admin/crm/summary" -Headers $headers
Invoke-Check -Name "CRM contacts" -Method Get -Url "$BaseUrl/api/admin/crm/contacts" -Headers $headers
Invoke-Check -Name "Create CRM contact" -Method Post -Url "$BaseUrl/api/admin/crm/contacts" -Headers $headers -Body @{
  email = "crm-smoke@selfcaresinners.com"
  fullName = "CRM Smoke Contact"
  lifecycleStage = "lead"
  marketingStatus = "subscribed"
  consentEmail = $true
  consentPush = $true
}
Invoke-Check -Name "CRM segments" -Method Get -Url "$BaseUrl/api/admin/crm/segments" -Headers $headers
Invoke-Check -Name "Create CRM segment" -Method Post -Url "$BaseUrl/api/admin/crm/segments" -Headers $headers -Body @{
  segmentKey = "smoke_high_intent"
  name = "Smoke High Intent"
  description = "Smoke test segment for PL17 lifecycle marketing."
  criteria = @{ intent = "high"; source = "smoke" }
}
Invoke-Check -Name "Lifecycle journeys" -Method Get -Url "$BaseUrl/api/admin/crm/journeys" -Headers $headers
Invoke-Check -Name "Create lifecycle journey" -Method Post -Url "$BaseUrl/api/admin/crm/journeys" -Headers $headers -Body @{
  journeyKey = "smoke_post_purchase_rebuy"
  name = "Smoke Post Purchase Rebuy"
  journeyType = "post_purchase"
  entryCriteria = @{ event = "order_paid" }
}
Invoke-Check -Name "CRM automation" -Method Get -Url "$BaseUrl/api/admin/crm/automation" -Headers $headers
Invoke-Check -Name "Run CRM automation" -Method Post -Url "$BaseUrl/api/admin/crm/automation/run" -Headers $headers -Body @{
  triggerKey = "smoke_abandoned_cart_recovery"
  eventName = "cart_abandoned"
  targetCount = 1
}
Invoke-Check -Name "CRM touchpoints" -Method Get -Url "$BaseUrl/api/admin/crm/touchpoints" -Headers $headers
Invoke-Check -Name "CRM campaigns" -Method Get -Url "$BaseUrl/api/admin/crm/campaigns" -Headers $headers
Invoke-Check -Name "Orchestrate CRM campaign" -Method Post -Url "$BaseUrl/api/admin/crm/campaigns/orchestrate" -Headers $headers -Body @{
  campaignKey = "smoke_lifecycle_campaign"
  name = "Smoke Lifecycle Campaign"
  segmentKey = "smoke_high_intent"
  channels = @("email", "push")
}
Invoke-Check -Name "Lifecycle insights" -Method Get -Url "$BaseUrl/api/admin/crm/lifecycle-insights" -Headers $headers
Invoke-Check -Name "Admin diagnostics" -Method Get -Url "$BaseUrl/api/admin/diagnostics" -Headers $headers

Write-Host "PASS CRM lifecycle smoke checks"
