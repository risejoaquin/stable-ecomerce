$ErrorActionPreference = 'Stop'

function Assert-FileExists([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path)) { throw "FAIL $Label - missing: $Path" }
    Write-Host "PASS $Label"
}

function Assert-Contains([string]$Path, [string]$Needle, [string]$Label) {
    if (-not (Select-String -Path $Path -Pattern ([regex]::Escape($Needle)) -Quiet)) {
        throw "FAIL $Label - '$Needle' not found in $Path"
    }
    Write-Host "PASS $Label"
}

$root = Resolve-Path (Join-Path $PSScriptRoot '../..')
Set-Location $root

$report = 'docs/design/MOBILE_UX_A_FULL_FRONTEND_VISUAL_INVENTORY.md'
Assert-FileExists $report 'mobile ux audit report exists'

$requiredSurfaces = @(
    'Home',
    'Product detail',
    'Login/Register/Forgot',
    'Verify email',
    'Profile',
    'My Orders',
    'Wishlist',
    'FAQ',
    'Checkout success',
    'Track order',
    'Reset password',
    'Recover cart',
    'Contact',
    'Privacy policy',
    'Return policy',
    'Terms and conditions',
    'Admin Dashboard',
    'Admin Email Center',
    'Admin Customers',
    'Admin Commercial',
    'Admin Categories',
    'Admin Orders',
    'Admin Products',
    'Admin Settings',
    'Coupons',
    'Cart drawer'
)

foreach ($surface in $requiredSurfaces) {
    Assert-Contains $report $surface "inventory covers $surface"
}

Assert-Contains $report 'StoreHeader' 'legacy StoreHeader debt recorded'
Assert-Contains $report 'Restoring Cart' 'recover cart english debt recorded'
Assert-Contains $report 'Privacy / Returns / Terms' 'legal content debt recorded'
Assert-Contains $report 'MOBILE/UX B' 'next storefront phase recorded'
Assert-Contains $report 'MOBILE/UX C' 'next account phase recorded'
Assert-Contains $report 'MOBILE/UX D' 'next admin phase recorded'
Assert-Contains $report 'MOBILE/UX E' 'next checkout QA phase recorded'
Assert-Contains $report 'MOBILE/UX F' 'final regression phase recorded'

Assert-FileExists 'src/components/editorial/EditorialHeader.tsx' 'editorial header protected'
Assert-FileExists 'src/components/editorial/MobileEditorialNav.tsx' 'mobile editorial nav protected'
Assert-FileExists 'src/components/uix/UixPageShell.tsx' 'uix page shell protected'
Assert-FileExists 'src/components/uix/UixStatePanel.tsx' 'uix state panel protected'
Assert-FileExists 'src/components/admin/uix/AdminCommandNav.tsx' 'admin command navigation protected'
Assert-FileExists 'public/sw.js' 'service worker protected'
Assert-FileExists 'src/routes/lazy-routes.tsx' 'lazy routes protected'

Write-Host 'PASS MOBILE/UX AUDIT A - full frontend visual inventory baseline'
