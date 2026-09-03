$ErrorActionPreference = "Stop"

function Assert-Contains {
  param([string]$Path, [string]$Pattern, [string]$Label)
  if (-not (Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch [regex]::Escape($Pattern)) { throw "FAIL $Label" }
  Write-Host "PASS $Label"
}

function Assert-NotContains {
  param([string]$Path, [string]$Pattern, [string]$Label)
  if (-not (Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -match [regex]::Escape($Pattern)) { throw "FAIL $Label" }
  Write-Host "PASS $Label"
}

$main = "src/main.tsx"
$systemCss = "src/styles/uix-soft-premium-system.css"

Assert-Contains $main "import './styles/uix-soft-premium-system.css';" "main imports canonical UIX stylesheet"
Assert-NotContains $main "premium-storefront.css" "main no longer imports premium-storefront directly"
Assert-NotContains $main "checkout-conversion.css" "main no longer imports checkout-conversion directly"
Assert-NotContains $main "final-visual-polish.css" "main no longer imports final-visual-polish directly"
Assert-NotContains $main "skoot-editorial-redesign.css" "main no longer imports skoot-editorial directly"
Assert-NotContains $main "soft-beauty-theme.css" "main no longer imports soft-beauty directly"

Assert-Contains $systemCss "EMERGENCY-DRY-04" "canonical stylesheet includes DRY-04 marker"
Assert-Contains $systemCss "BEGIN LEGACY SOURCE: src/styles/premium-storefront.css" "premium storefront styles consolidated"
Assert-Contains $systemCss "BEGIN LEGACY SOURCE: src/styles/checkout-conversion.css" "checkout styles consolidated"
Assert-Contains $systemCss "BEGIN LEGACY SOURCE: src/styles/final-visual-polish.css" "final polish styles consolidated"
Assert-Contains $systemCss "BEGIN LEGACY SOURCE: src/styles/skoot-editorial-redesign.css" "editorial styles consolidated"
Assert-Contains $systemCss "BEGIN LEGACY SOURCE: src/styles/soft-beauty-theme.css" "soft beauty theme consolidated"
Assert-Contains $systemCss ".ss-editorial-cart-button svg" "cart icon contrast override exists"
Assert-Contains $systemCss ".ss-account-dropdown" "account dropdown canonical surface exists"
Assert-Contains $systemCss ".ss-mobile-account-sheet" "mobile account sheet canonical surface exists"
Assert-Contains $systemCss "overflow-x: hidden" "horizontal overflow guard exists"

Write-Host "PASS emergency dry 04 CSS collision cleanup checks"
