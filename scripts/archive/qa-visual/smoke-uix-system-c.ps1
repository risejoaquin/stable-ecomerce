$ErrorActionPreference = "Stop"

function Assert-FileContains {
  param([string]$Path, [string]$Pattern, [string]$Message)
  if (-not (Test-Path $Path)) { throw "FAIL $Message -- missing file $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch [regex]::Escape($Pattern)) { throw "FAIL $Message -- missing pattern $Pattern" }
  Write-Host "PASS $Message"
}

Assert-FileContains "src/components/uix/UixPageShell.tsx" "export function UixPageShell" "UIX page shell exists"
Assert-FileContains "src/components/uix/UixStatePanel.tsx" "export function UixStatePanel" "UIX state panel exists"
Assert-FileContains "src/components/uix/UixStatusBadge.tsx" "export function UixStatusBadge" "UIX status badge exists"
Assert-FileContains "src/pages/store/MyOrdersPage.tsx" "UixPageShell" "my orders uses UIX page shell"
Assert-FileContains "src/pages/store/WishlistPage.tsx" "UixPageShell" "wishlist uses UIX page shell"
Assert-FileContains "src/pages/store/FaqPage.tsx" "UixPageShell" "FAQ uses UIX page shell"
Assert-FileContains "src/pages/store/MyOrdersPage.tsx" "UixStatePanel" "customer loading/empty/error states centralized"
Assert-FileContains "src/pages/store/WishlistPage.tsx" "UixStatePanel" "wishlist empty state centralized"
Assert-FileContains "src/pages/store/MyOrdersPage.tsx" "UixStatusBadge" "order status badge centralized"
Assert-FileContains "src/styles/uix-soft-premium-system.css" "UIX SYSTEM C: Storefront/Admin/Profile Consistency Polish" "UIX System C CSS marker exists"
Assert-FileContains "docs/design/UIX_SYSTEM_C_FULL_STOREFRONT_ADMIN_PROFILE_CONSISTENCY_POLISH.md" "Full Storefront/Admin/Profile Consistency Polish" "UIX System C documentation exists"

Write-Host "PASS uix system c storefront admin profile consistency polish checks"
