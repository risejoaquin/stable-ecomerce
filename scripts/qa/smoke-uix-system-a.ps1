$ErrorActionPreference = "Stop"

function Assert-FileContains {
  param([string]$Path, [string]$Pattern, [string]$Message)
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch [regex]::Escape($Pattern)) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

function Assert-RegexContains {
  param([string]$Path, [string]$Pattern, [string]$Message)
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

Assert-FileContains "src/main.tsx" "./styles/uix-soft-premium-system.css" "canonical UIX stylesheet imported"
Assert-FileContains "src/components/uix/UixSectionHeader.tsx" "UixSectionHeader" "UIX section header component exists"
Assert-FileContains "src/components/uix/UixCard.tsx" "UixCard" "UIX card component exists"
Assert-FileContains "src/components/storefront/uix/StorefrontTrustStrip.tsx" "StorefrontTrustStrip" "storefront trust strip exists"
Assert-FileContains "src/components/storefront/uix/RoutineCards.tsx" "RoutineCards" "routine cards component exists"
Assert-FileContains "src/components/storefront/uix/ShopByConcern.tsx" "ShopByConcern" "shop by concern component exists"
Assert-FileContains "src/components/storefront/uix/StorefrontNewsletter.tsx" "StorefrontNewsletter" "newsletter component exists"
Assert-FileContains "src/pages/store/HomePage.tsx" "<StorefrontTrustStrip />" "home includes trust strip"
Assert-FileContains "src/pages/store/HomePage.tsx" "<RoutineCards />" "home includes routine cards"
Assert-FileContains "src/pages/store/HomePage.tsx" "<ShopByConcern />" "home includes shop by concern"
Assert-FileContains "src/pages/store/HomePage.tsx" "<StorefrontNewsletter />" "home includes newsletter"
Assert-FileContains "src/styles/uix-soft-premium-system.css" "UIX SYSTEM A" "UIX System A CSS marker exists"
Assert-RegexContains "src/styles/uix-soft-premium-system.css" "(?s)^(@import[^\n]+\n)+" "CSS imports are hoisted before rules"
Assert-FileContains "docs/design/UIX_SYSTEM_A_STOREFRONT_HOME_ARCHITECTURE.md" "UIX SYSTEM A" "UIX System A documentation exists"
Write-Host "PASS uix system a storefront home architecture checks"
