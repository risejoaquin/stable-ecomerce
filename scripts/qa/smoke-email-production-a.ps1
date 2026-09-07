$ErrorActionPreference = "Stop"

function Assert-FileContains {
  param([string]$Path, [string]$Pattern, [string]$Label)
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Label" }
  Write-Host "PASS $Label"
}

Assert-FileContains "src/server/email/email-service.ts" "class EmailService" "central EmailService exists"
Assert-FileContains "src/server/email/email-service.ts" "RESEND_API_KEY is not configured in production" "production email config fails closed"
Assert-FileContains "src/server/email/email-service.ts" "crypto\.randomUUID" "email request id generated"
Assert-FileContains "src/server/email/email-service.ts" "buildEmailDedupeKey" "EmailService uses dedupe key builder"
Assert-FileContains "src/server/email/email-service.ts" "safeSubject" "EmailService sanitizes subjects"
Assert-FileContains "src/server/email/email-service.ts" "safeHtmlBody" "EmailService validates HTML body"
Assert-FileContains "src/server/email/email-policy.ts" "review_request" "email policy covers review requests"
Assert-FileContains "src/server/email/email-policy.ts" "abandoned_cart_recovery" "email policy covers abandoned cart"
Assert-FileContains "src/server/email/email-events.ts" "dedupe_key" "email events support dedupe key"
Assert-FileContains "src/server/email/email-events.ts" "request_id" "email events support request id"
Assert-FileContains "src/server/email/email-template-system.ts" "buildSoftPremiumEmailLayout" "premium email layout exists"
Assert-FileContains "server.ts" "buildSoftPremiumEmailLayout" "server uses central premium email layout"
Assert-FileContains "server.ts" "/api/admin/email/service-health" "admin email service health endpoint exists"
Assert-FileContains "server.ts" "app\.get\('/api/admin/email/events', requireAuth\(\), requireAdmin\(\)" "admin email events require admin"
Assert-FileContains "server.ts" "review_request" "review request purpose is explicit"
Assert-FileContains "scripts/db/041_email_production_a_safety_service_contract.sql" "idx_email_events_dedupe_key" "email event dedupe index migration exists"
Assert-FileContains "docs/email/EMAIL_PRODUCTION_A_SAFETY_SERVICE_CONSOLIDATION.md" "EMAIL PRODUCTION A" "email production A documentation exists"
Write-Host "PASS email production A safety service consolidation checks"
