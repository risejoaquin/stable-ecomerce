param(
  [string]$BaseUrl = "",
  [string]$Email = "",
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

function Assert-FileContains($Path, $Pattern, $Label) {
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Label" }
  Write-Host "PASS $Label"
}

Assert-FileContains "src/server/email/email-service.ts" "class EmailService" "central EmailService exists"
Assert-FileContains "src/server/email/email-sanitize.ts" "escapeHtml" "email HTML sanitizer exists"
Assert-FileContains "src/server/email/email-events.ts" "email_events" "email event writer exists"
Assert-FileContains "server.ts" "emailSensitiveLimiter" "sensitive email rate limiter exists"
Assert-FileContains "server.ts" "adminEmailLimiter" "admin email rate limiter exists"
Assert-FileContains "server.ts" "buildAppLink\('/verify-email'" "verification uses canonical APP_URL"
Assert-FileContains "server.ts" "buildAppLink\('/reset-password'" "password reset uses canonical APP_URL"
Assert-FileContains "server.ts" "buildAppLink\('/recover'" "abandoned cart recover URL fixed"
Assert-FileContains "server.ts" "resend-confirmation', requireAuth\(\), requireAdmin\(\), adminEmailLimiter" "resend confirmation explicitly protected"
Assert-FileContains "email-templates.ts" "safeText" "email templates sanitize dynamic text"
Assert-FileContains "email-templates.ts" "sanitizeEmailUrl" "email templates sanitize URLs"
Assert-FileContains "scripts/db/039_macro_email_uix_a_email_safety_event_contract.sql" "CREATE TABLE IF NOT EXISTS email_events" "email event contract migration exists"

if ($BaseUrl) {
  $target = "$BaseUrl/api/admin/orders/00000000-0000-0000-0000-000000000000/resend-confirmation"
  try {
    Invoke-RestMethod -Method Post -Uri $target -ContentType "application/json" -Body "{}" | Out-Null
    throw "FAIL unauthenticated resend-confirmation should not succeed"
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -ne 401 -and $status -ne 403) { throw "FAIL unauthenticated resend-confirmation expected 401/403, got $status" }
    Write-Host "PASS unauthenticated resend-confirmation blocked -> $status"
  }
}

Write-Host "PASS macro email uix a safety checks"
