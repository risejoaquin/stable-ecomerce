$ErrorActionPreference = "Stop"

function Assert-Contains($Path, $Pattern, $Message) {
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

Assert-Contains "src/server/email/email-queue.ts" "enqueueEmail" "email queue module exists"
Assert-Contains "src/server/email/email-worker.ts" "processEmailQueueBatch" "email worker module exists"
Assert-Contains "src/server/email/email-webhooks.ts" "processResendWebhookEvent" "resend webhook module exists"
Assert-Contains "src/server/email/email-deliverability.ts" "email_suppression_list" "deliverability module exists"
Assert-Contains "scripts/db/042_email_production_b_queue_webhooks_deliverability.sql" "CREATE TABLE IF NOT EXISTS email_queue" "email queue migration exists"
Assert-Contains "scripts/db/042_email_production_b_queue_webhooks_deliverability.sql" "CREATE TABLE IF NOT EXISTS email_delivery_attempts" "email_delivery_attempts table contract exists"
Assert-Contains "scripts/db/042_email_production_b_queue_webhooks_deliverability.sql" "CREATE TABLE IF NOT EXISTS email_suppression_list" "email_suppression_list table contract exists"
Assert-Contains "src/server/email/email-queue.ts" "dedupe_key" "queue supports dedupe_key"
Assert-Contains "src/server/email/email-queue.ts" "locked_until" "queue supports locking"
Assert-Contains "src/server/email/email-queue.ts" "next_attempt_at" "queue supports retry/backoff"
Assert-Contains "src/server/email/email-queue.ts" "provider_message_id" "queue supports provider_message_id"
Assert-Contains "server.ts" "/api/webhooks/resend" "resend webhook route exists"
Assert-Contains "src/server/email/email-webhooks.ts" "delivered" "resend webhook handles delivered"
Assert-Contains "src/server/email/email-webhooks.ts" "bounced" "resend webhook handles bounced"
Assert-Contains "src/server/email/email-webhooks.ts" "complained" "resend webhook handles complained"
Assert-Contains "server.ts" "/api/admin/email/queue" "admin email queue endpoint exists"
Assert-Contains "docs/email/EMAIL_PRODUCTION_B_QUEUE_WEBHOOKS_DELIVERABILITY.md" "EMAIL PRODUCTION B" "email production B documentation exists"

Write-Host "PASS email production B queue webhooks deliverability checks"
