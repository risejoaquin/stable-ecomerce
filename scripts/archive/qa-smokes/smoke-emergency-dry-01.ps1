$ErrorActionPreference = "Stop"

function Assert-Contains($Path, $Pattern, $Message) {
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

function Assert-Count($Path, $Pattern, $Expected, $Message) {
  $content = Get-Content $Path -Raw
  $count = ([regex]::Matches($content, $Pattern)).Count
  if ($count -ne $Expected) { throw "FAIL $Message. Expected $Expected, found $count" }
  Write-Host "PASS $Message"
}

Assert-Count "server.ts" "app\.post\('/api/admin/catalog/validate-import'" 1 "single validate-import admin route"
Assert-Contains "src/lib/auth-session.ts" "export function logoutUser" "central logoutUser exists"
Assert-Contains "src/lib/auth-session.ts" "localStorage\.removeItem\('auth_token'\)" "central logout clears auth token"
Assert-Contains "src/lib/auth-session.ts" "localStorage\.removeItem\('guest_email'\)" "central logout clears guest email"
Assert-Contains "src/lib/auth-session.ts" "auth:logout" "central logout dispatches auth event"
Assert-Count "src/components/editorial/EditorialHeader.tsx" "localStorage\.removeItem\('auth_token'\)" 0 "header no longer owns logout storage mutation"
Assert-Count "src/components/editorial/MobileEditorialNav.tsx" "localStorage\.removeItem\('auth_token'\)" 0 "mobile nav no longer owns logout storage mutation"
Assert-Count "src/components/AuthMock.tsx" "localStorage\.removeItem\('auth_token'\)" 0 "AuthMock no longer owns logout storage mutation"
Assert-Contains "src/components/editorial/EditorialHeader.tsx" "logoutUser\(\{ redirectTo: '/' \}\)" "header uses centralized logout"
Assert-Contains "src/components/editorial/MobileEditorialNav.tsx" "logoutUser\(\{ redirectTo: '/' \}\)" "mobile nav uses centralized logout"
Assert-Contains "src/components/AuthMock.tsx" "logoutUser\(\{ redirectTo: '/' \}\)" "AuthMock uses centralized logout"
Write-Host "PASS emergency dry 01 checks"
