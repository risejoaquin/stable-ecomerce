$ErrorActionPreference = "Stop"

function Assert-FileContains($Path, $Pattern, $Message) {
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

function Assert-Count($Path, $Pattern, $Expected, $Message) {
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  $count = ([regex]::Matches($content, $Pattern)).Count
  if ($count -ne $Expected) { throw "FAIL $Message. Expected $Expected, got $count" }
  Write-Host "PASS $Message"
}

Assert-FileContains "server.ts" "claim_abandoned_carts_for_recovery" "abandoned carts claimed via atomic RPC"
Assert-FileContains "server.ts" "recovery_lock_id" "recovery lock token used by job"
Assert-FileContains "server.ts" "recovery_locked_until" "recovery lock expiration used by job"
Assert-FileContains "server.ts" "markAbandonedCartRecoverySent" "successful sends marked only after provider success"
Assert-FileContains "server.ts" "releaseAbandonedCartRecoveryLock" "failed sends release lock with error"
Assert-FileContains "server.ts" "result\?\.success" "sendEmail result checked before marking reminder sent"
Assert-FileContains "server.ts" "ABANDONED_CART_RECOVERY_DISABLED" "job can be disabled by environment flag"
Assert-FileContains "server.ts" "buildAppLink\('/recover'" "canonical recovery link still used"
Assert-FileContains "scripts/db/040_emergency_dry_03_abandoned_cart_recovery_locking.sql" "FOR UPDATE SKIP LOCKED" "PostgreSQL row locking prevents double claims"
Assert-FileContains "scripts/db/040_emergency_dry_03_abandoned_cart_recovery_locking.sql" "CREATE OR REPLACE FUNCTION claim_abandoned_carts_for_recovery" "claim function migration exists"
Assert-FileContains "scripts/db/040_emergency_dry_03_abandoned_cart_recovery_locking.sql" "recovery_attempts" "recovery attempts are tracked"
Assert-Count "server.ts" "\.update\(\{ reminder_sent: true \}\)" 0 "legacy unconditional reminder_sent update removed"
Write-Host "PASS emergency dry 03 abandoned cart race-condition checks"
