$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $root

$server = Get-Content "server.ts" -Raw
$emailWebhooks = Get-Content "src\server\email\email-webhooks.ts" -Raw

function Pass([string]$Message) {
  Write-Host "PASS $Message" -ForegroundColor Green
}

function Fail([string]$Message) {
  Write-Host "FAIL $Message" -ForegroundColor Red
  exit 1
}

function Assert-Contains([string]$Content, [string]$Pattern, [string]$Message) {
  if ($Content -notmatch $Pattern) { Fail $Message }
  Pass $Message
}

$resendIndex = $server.IndexOf("'/api/webhooks/resend'")
$jsonIndex = $server.IndexOf("app.use(express.json())")
if ($resendIndex -lt 0) { Fail "Resend webhook route exists" }
Pass "Resend webhook route exists"

if ($resendIndex -lt 0 -or $jsonIndex -lt 0 -or $resendIndex -gt $jsonIndex) {
  Fail "Resend webhook appears before global express.json"
}
Pass "Resend webhook appears before global express.json"

$resendRoute = $server.Substring($resendIndex, $jsonIndex - $resendIndex)

Assert-Contains $resendRoute "express\.raw\(\{\s*type:\s*'application/json'\s*\}\)" "Resend webhook uses express.raw"
Assert-Contains $resendRoute "resend\.webhooks\.verify" "Resend webhook uses resend.webhooks.verify"
Assert-Contains $resendRoute "svix-id" "Resend webhook reads svix-id"
Assert-Contains $resendRoute "svix-timestamp" "Resend webhook reads svix-timestamp"
Assert-Contains $resendRoute "svix-signature" "Resend webhook reads svix-signature"
Assert-Contains $server "'RESEND_WEBHOOK_SECRET'" "RESEND_WEBHOOK_SECRET required in production"

if ($emailWebhooks -match "verifyResendWebhookSignature|createHmac|import crypto from 'crypto'") {
  Fail "legacy custom HMAC verifier removed"
}
Pass "legacy custom HMAC verifier removed"

$verifyIndex = $resendRoute.IndexOf("resend.webhooks.verify")
$processIndex = $resendRoute.IndexOf("processResendWebhookEvent")
if ($verifyIndex -lt 0 -or $processIndex -lt 0 -or $verifyIndex -gt $processIndex) {
  Fail "Resend processing occurs only after verification"
}
Pass "Resend processing occurs only after verification"

exit 0
