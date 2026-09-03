$ErrorActionPreference = "Stop"

function Assert-Contains($Path, $Pattern, $Message) {
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

Assert-Contains "src/server/email/email-admin-center.ts" "EMAIL_TEMPLATE_CATALOG" "email template catalog exists"
Assert-Contains "src/server/email/email-admin-center.ts" "buildEmailTemplatePreview" "premium template preview builder exists"
Assert-Contains "server.ts" "/api/admin/email/templates" "admin email templates route exists"
Assert-Contains "server.ts" "/api/admin/email/templates/preview" "admin email template preview route exists"
Assert-Contains "server.ts" "/api/admin/email/send-test" "admin email test send route exists"
Assert-Contains "server.ts" "requireAdmin\(\).*asyncHandler" "admin email routes are protected"
Assert-Contains "src/pages/admin/AdminEmailCenterPage.tsx" "AdminEmailCenterPage" "admin email center page exists"
Assert-Contains "src/pages/admin/AdminEmailCenterPage.tsx" "Centro de correos" "admin email center Spanish UI exists"
Assert-Contains "src/hooks/useAdminEmail.ts" "useAdminEmailEvents" "admin email hooks exist"
Assert-Contains "src/App.tsx" "AdminEmailCenterPage" "admin email page routed"
Assert-Contains "src/App.tsx" "/admin/email" "admin email nav route exists"
Assert-Contains "src/styles/uix-soft-premium-system.css" "EMAIL PRODUCTION C" "email center UI styles exist"
Assert-Contains "scripts/db/043_email_production_c_admin_center_templates.sql" "email_template_catalog" "email template catalog migration exists"
Assert-Contains "scripts/db/043_email_production_c_admin_center_templates.sql" "email_template_preview_events" "email template preview event migration exists"
Assert-Contains "docs/email/EMAIL_PRODUCTION_C_ADMIN_EMAIL_CENTER_PREMIUM_TEMPLATES.md" "EMAIL PRODUCTION C" "email production C documentation exists"
Write-Host "PASS email production C admin email center premium templates checks"
