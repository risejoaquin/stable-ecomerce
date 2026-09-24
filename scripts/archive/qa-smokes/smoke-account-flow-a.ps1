$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail($message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }
function Assert-File($path, $message) { if (Test-Path $path) { Pass $message } else { Fail "$message ($path missing)" } }
function Assert-ContainsLiteral($path, $text, $message) {
  if (!(Test-Path $path)) { Fail "$message ($path missing)" }
  $content = Get-Content $path -Raw
  if ($content.Contains($text)) { Pass $message } else { Fail "$message ($path missing text: $text)" }
}
function Assert-NotContainsLiteral($path, $text, $message) {
  if (!(Test-Path $path)) { Fail "$message ($path missing)" }
  $content = Get-Content $path -Raw
  if (-not $content.Contains($text)) { Pass $message } else { Fail "$message (unexpected text: $text)" }
}

Assert-File "src\components\AuthMock.tsx" "auth modal exists"
Assert-File "src\hooks\useUserSafe.ts" "safe user hook exists"
Assert-File "src\pages\store\ProfilePage.tsx" "profile page exists"
Assert-File "src\pages\store\VerifyEmailPage.tsx" "verify email page exists"
Assert-File "email-templates.ts" "email templates source exists"
Assert-File "docs\design\ACCOUNT_FLOW_A_ROLES_REGISTRATION_PROFILE_DATA_INTEGRITY.md" "account flow documentation exists"

Assert-NotContainsLiteral "src\components\AuthMock.tsx" "alert(" "browser alert removed from auth modal"
Assert-ContainsLiteral "src\components\AuthMock.tsx" "uix-auth-success" "auth modal has inline success state"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'role="status"' "auth success uses status role"
Assert-ContainsLiteral "src\components\AuthMock.tsx" "Cuenta creada. Te enviamos un correo" "registration success message is inline"

Assert-ContainsLiteral "src\hooks\useUserSafe.ts" "role = 'guest'" "guest role is explicit"
Assert-ContainsLiteral "src\hooks\useUserSafe.ts" "payload.role === 'admin' ? 'admin' : 'user'" "user/admin role normalization exists"
Assert-NotContainsLiteral "src\hooks\useUserSafe.ts" "Local Admin" "mock local admin removed"

Assert-ContainsLiteral "server.ts" "role: 'user'" "registration creates customer role"
Assert-ContainsLiteral "server.ts" "Verifica tu cuenta de Selfcare Sinners" "registration email subject is localized"

Assert-ContainsLiteral "email-templates.ts" "background:#f7efe5" "email templates use premium background"
Assert-ContainsLiteral "email-templates.ts" "Verifica tu cuenta" "verification email uses premium Spanish title"
Assert-ContainsLiteral "email-templates.ts" "border-radius:28px" "email templates use premium card layout"

Assert-ContainsLiteral "src\pages\store\VerifyEmailPage.tsx" "UixPageShell" "verify email page uses UIX shell"
Assert-ContainsLiteral "src\pages\store\VerifyEmailPage.tsx" "Tu correo fue confirmado" "verify email success copy is premium Spanish"
Assert-NotContainsLiteral "src\pages\store\VerifyEmailPage.tsx" "Verifying Email" "old verify email English page removed"
Assert-NotContainsLiteral "src\pages\store\VerifyEmailPage.tsx" "bg-[#F5F5F7]" "old verify email visual shell removed"

Assert-ContainsLiteral "src\pages\store\ProfilePage.tsx" "apiClient.get('/orders/my')" "profile reads real customer orders"
Assert-ContainsLiteral "src\pages\store\ProfilePage.tsx" "useWishlist()" "profile reads real wishlist"
Assert-ContainsLiteral "src\pages\store\ProfilePage.tsx" "Pedidos reales" "profile labels real orders"
Assert-ContainsLiteral "src\pages\store\ProfilePage.tsx" "No mostramos puntos ni cupones estáticos" "profile avoids static rewards"
Assert-ContainsLiteral "src\pages\store\ProfilePage.tsx" "No mostraremos tarjetas ficticias" "profile avoids fake payment cards"
Assert-NotContainsLiteral "src\pages\store\ProfilePage.tsx" "#SS10458" "static order id removed"
Assert-NotContainsLiteral "src\pages\store\ProfilePage.tsx" "Visa terminada en 4242" "static card removed"
Assert-NotContainsLiteral "src\pages\store\ProfilePage.tsx" "SINNER10" "static coupon removed"
Assert-NotContainsLiteral "src\pages\store\ProfilePage.tsx" "Sofía Martínez" "static customer name removed"

Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" "ACCOUNT FLOW A" "account flow CSS marker exists"
Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" "uix-auth-success" "auth success CSS exists"
Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" "uix-profile-grid" "profile real data CSS exists"

Write-Host "PASS account flow a roles registration profile data integrity checks" -ForegroundColor Green
