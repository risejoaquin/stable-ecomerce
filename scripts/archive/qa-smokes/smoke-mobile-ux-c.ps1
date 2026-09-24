$ErrorActionPreference = 'Stop'

function Assert-FileExists {
    param([string]$Path, [string]$Label)
    if (-not (Test-Path $Path)) { throw "FAIL $Label - missing $Path" }
    Write-Host "PASS $Label"
}

function Assert-Contains {
    param([string]$Path, [string]$Needle, [string]$Label)
    $content = Get-Content -Raw -Path $Path
    if (-not $content.Contains($Needle)) { throw "FAIL $Label - marker not found in $Path" }
    Write-Host "PASS $Label"
}

function Assert-NotContains {
    param([string]$Path, [string]$Needle, [string]$Label)
    $content = Get-Content -Raw -Path $Path
    if ($content.Contains($Needle)) { throw "FAIL $Label - legacy marker still exists in $Path" }
    Write-Host "PASS $Label"
}

$report = 'docs/design/MOBILE_UX_C_ACCOUNT_PROFILE_MOBILE_ADAPTABILITY.md'
$auth = 'src/components/AuthMock.tsx'
$verifyEmail = 'src/pages/store/VerifyEmailPage.tsx'
$resetPassword = 'src/pages/store/ResetPasswordPage.tsx'
$recoverCart = 'src/pages/store/RecoverCartPage.tsx'
$profile = 'src/pages/store/ProfilePage.tsx'
$orders = 'src/pages/store/MyOrdersPage.tsx'
$wishlist = 'src/pages/store/WishlistPage.tsx'
$trackOrder = 'src/pages/store/TrackOrderPage.tsx'
$checkoutSuccess = 'src/pages/store/CheckoutSuccessPage.tsx'
$css = 'src/styles/uix-soft-premium-system.css'
$serviceWorker = 'public/sw.js'
$lazyRoutes = 'src/routes/lazy-routes.tsx'

Assert-FileExists $report 'MOBILE UX C report exists'
Assert-FileExists $auth 'auth modal source exists'
Assert-FileExists $verifyEmail 'verify email source exists'
Assert-FileExists $profile 'profile source exists'
Assert-FileExists $orders 'orders source exists'
Assert-FileExists $wishlist 'wishlist source exists'
Assert-FileExists $serviceWorker 'service worker protected'
Assert-FileExists $lazyRoutes 'lazy routes protected'

Assert-Contains $auth "event.key === 'Escape'" 'auth modal Escape close exists'
Assert-Contains $auth "document.body.style.overflow = 'hidden'" 'auth modal scroll lock exists'
Assert-Contains $auth 'uix-auth-overlay' 'premium auth modal protected'
Assert-Contains $verifyEmail 'UixPageShell' 'verify email premium shell protected'
Assert-Contains $verifyEmail 'uix-auth-result-card' 'verify email result state protected'

Assert-Contains $resetPassword 'UixPageShell' 'reset password premium shell exists'
Assert-Contains $resetPassword 'data-mobile-ux-c="reset-password-premium"' 'reset password phase marker exists'
Assert-Contains $resetPassword 'autoComplete="new-password"' 'reset password autocomplete exists'
Assert-NotContains $resetPassword 'min-h-screen bg-[var(--color-background)]' 'reset password legacy card removed'

Assert-Contains $recoverCart 'UixPageShell' 'recover cart premium shell exists'
Assert-Contains $recoverCart 'data-mobile-ux-c="recover-cart-premium"' 'recover cart phase marker exists'
Assert-NotContains $recoverCart 'Restoring Cart' 'recover cart old English heading removed'
Assert-NotContains $recoverCart 'Recovering your cart' 'recover cart old English status removed'
Assert-NotContains $recoverCart 'Cart recovered successfully' 'recover cart old English success removed'

Assert-Contains $profile 'UixPageShell' 'profile premium shell protected'
Assert-Contains $profile 'real-customer-metrics' 'profile real data metrics protected'
Assert-Contains $orders 'UixStatePanel' 'orders state panels protected'
Assert-Contains $wishlist 'UixStatePanel' 'wishlist state panels protected'

Assert-Contains $trackOrder 'UixPageShell' 'track order premium shell exists'
Assert-Contains $trackOrder 'UixStatePanel' 'track order UIX states exist'
Assert-Contains $trackOrder 'data-mobile-ux-c="track-order-premium"' 'track order phase marker exists'
Assert-NotContains $trackOrder 'StoreHeader' 'track order legacy StoreHeader removed'

Assert-Contains $checkoutSuccess 'UixPageShell' 'checkout success premium shell exists'
Assert-Contains $checkoutSuccess 'data-mobile-ux-c="checkout-success-premium"' 'checkout success phase marker exists'
Assert-Contains $checkoutSuccess 'PostPurchaseNextSteps' 'post purchase behavior protected'
Assert-Contains $checkoutSuccess 'clearCart()' 'checkout success cart clearing protected'

Assert-Contains $css 'MOBILE/UX C' 'MOBILE UX C CSS marker exists'
Assert-Contains $css '.uix-account-auth-card' 'account auth responsive card styles exist'
Assert-Contains $css '.uix-track-layout' 'track order responsive layout exists'
Assert-Contains $css '.uix-checkout-success' 'checkout success responsive styles exist'
Assert-Contains $css '@media (max-width: 430px)' 'small mobile account breakpoint exists'

Write-Host 'PASS MOBILE/UX C - account profile mobile adaptability checks'
