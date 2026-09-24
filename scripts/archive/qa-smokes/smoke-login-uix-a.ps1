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

Assert-File "src\components\AuthMock.tsx" "auth modal source exists"
Assert-File "src\styles\uix-soft-premium-system.css" "canonical UIX stylesheet exists"
Assert-File "docs\design\LOGIN_UIX_A_PREMIUM_AUTH_MODAL.md" "login UIX documentation exists"

Assert-ContainsLiteral "src\components\AuthMock.tsx" "uix-auth-overlay" "auth modal uses premium overlay"
Assert-ContainsLiteral "src\components\AuthMock.tsx" "uix-auth-modal" "auth modal uses premium shell"
Assert-ContainsLiteral "src\components\AuthMock.tsx" "uix-auth-visual" "auth modal includes brand visual panel"
Assert-ContainsLiteral "src\components\AuthMock.tsx" "uix-auth-form-panel" "auth modal includes form panel"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'role="dialog"' "auth modal has dialog role"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'aria-modal="true"' "auth modal has aria modal"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'autoComplete="email"' "auth email autocomplete configured"
Assert-ContainsLiteral "src\components\AuthMock.tsx" "autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}" "auth password autocomplete configured"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'role="alert"' "auth error uses alert role"

Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" "LOGIN UIX A" "login UIX CSS marker exists"
Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" ".uix-auth-overlay" "login overlay CSS exists"
Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" ".uix-auth-modal" "login modal CSS exists"
Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" ".uix-auth-submit" "login submit CSS exists"
Assert-ContainsLiteral "src\styles\uix-soft-premium-system.css" "@media (max-width: 820px)" "login responsive CSS exists"

Pass "login uix a premium auth modal checks"
