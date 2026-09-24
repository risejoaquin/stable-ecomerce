$ErrorActionPreference = "Stop"

function Assert-FileContains {
  param([string]$Path, [string]$Pattern, [string]$Message)
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

function Assert-FileNotContains {
  param([string]$Path, [string]$Pattern, [string]$Message)
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -match $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

Assert-FileContains "src/components/account/account-links.ts" "accountNavigationLinks" "canonical account navigation links exist"
Assert-FileContains "src/components/account/account-links.ts" "adminAccountNavigationLink" "admin account link centralized"
Assert-FileContains "src/components/account/AccountMenu.tsx" "getAccountNavigationLinks" "desktop account menu uses centralized links"
Assert-FileContains "src/components/account/AccountMenu.tsx" "logoutUser" "desktop account menu uses centralized logout"
Assert-FileContains "src/components/account/AccountMenu.tsx" "openAuthDialog" "desktop account menu uses centralized auth modal opener"
Assert-FileContains "src/components/account/AccountMobileSheet.tsx" "getAccountNavigationLinks" "mobile account sheet uses centralized links"
Assert-FileContains "src/components/account/AccountMobileSheet.tsx" "ss-mobile-account-sheet" "mobile account sheet canonical surface exists"
Assert-FileContains "src/components/editorial/EditorialHeader.tsx" "<AccountMenu" "editorial header reuses AccountMenu"
Assert-FileNotContains "src/components/editorial/EditorialHeader.tsx" "function AccountDropdown" "editorial header no longer defines local AccountDropdown"
Assert-FileContains "src/components/editorial/MobileEditorialNav.tsx" "<AccountMobileSheet" "mobile nav reuses AccountMobileSheet"
Assert-FileNotContains "src/components/editorial/MobileEditorialNav.tsx" "mobileAccountLinks" "mobile nav no longer owns account links"
Assert-FileContains "src/components/AuthMock.tsx" "<AccountMenu" "AuthMock UserButton reuses AccountMenu"
Assert-FileNotContains "src/components/AuthMock.tsx" "const handleSignOut" "AuthMock no longer owns signout handler"
Assert-FileContains "src/lib/auth-modal.ts" "setAuthModalOpener" "central auth modal controller exists"
Assert-FileContains "src/lib/auth-modal.ts" "openAuthDialog" "central auth modal open function exists"
Assert-FileContains "src/types.ts" "export \* from './types/index'" "legacy types file is compatibility re-export"
Assert-FileContains "src/types/index.ts" "export interface Product" "canonical Product type exists"
Assert-FileContains "src/types/index.ts" "store_id\?" "canonical Product type supports legacy snake_case"
Assert-FileContains "src/types/index.ts" "storeId\?" "canonical Product type supports camelCase"
Assert-FileContains "docs/emergency/EMERGENCY_DRY_05_ACCOUNT_MENU_TYPES_CONSOLIDATION.md" "Account Menu" "DRY-05 documentation exists"

Write-Host "PASS emergency dry 05 account menu and type consolidation checks"
