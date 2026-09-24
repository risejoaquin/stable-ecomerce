$ErrorActionPreference = 'Stop'

function Assert-FileExists([string]$Path, [string]$Label) {
  if (-not (Test-Path $Path)) { throw "FAIL $Label - missing $Path" }
  Write-Host "PASS $Label"
}

function Assert-Contains([string]$Path, [string]$Needle, [string]$Label) {
  if (-not (Select-String -Path $Path -Pattern $Needle -SimpleMatch -Quiet)) { throw "FAIL $Label - '$Needle' not found in $Path" }
  Write-Host "PASS $Label"
}

function Assert-NotContains([string]$Path, [string]$Needle, [string]$Label) {
  if (Select-String -Path $Path -Pattern $Needle -SimpleMatch -Quiet) { throw "FAIL $Label - legacy '$Needle' still found in $Path" }
  Write-Host "PASS $Label"
}

$report = 'docs/design/MOBILE_UX_E_CHECKOUT_CART_ORDER_FLOW_MOBILE_QA.md'
$app = 'src/App.tsx'
$checkoutHook = 'src/hooks/useCheckout.ts'
$recoverCart = 'src/pages/store/RecoverCartPage.tsx'
$orders = 'src/pages/store/MyOrdersPage.tsx'
$trackOrder = 'src/pages/store/TrackOrderPage.tsx'
$checkoutSuccess = 'src/pages/store/CheckoutSuccessPage.tsx'
$css = 'src/styles/uix-soft-premium-system.css'
$server = 'server.ts'
$serviceWorker = 'public/sw.js'
$lazyRoutes = 'src/routes/lazy-routes.tsx'

Assert-FileExists $report 'MOBILE UX E report exists'
Assert-FileExists $app 'cart drawer source exists'
Assert-FileExists $checkoutHook 'checkout hook exists'
Assert-FileExists $recoverCart 'recover cart source exists'
Assert-FileExists $orders 'orders source exists'
Assert-FileExists $trackOrder 'track order source exists'
Assert-FileExists $checkoutSuccess 'checkout success source exists'
Assert-FileExists $serviceWorker 'service worker protected'
Assert-FileExists $lazyRoutes 'lazy routes protected'

Assert-Contains $app 'previousFocusRef' 'cart focus restoration exists'
Assert-Contains $app 'closeButtonRef' 'cart initial focus target exists'
Assert-Contains $app 'guest-checkout-email' 'guest checkout email label contract exists'
Assert-Contains $app 'autoComplete="email"' 'guest checkout email autocomplete exists'
Assert-Contains $app 'aria-busy={checkout.isPending}' 'checkout pending semantics exist'
Assert-Contains $app 'role="alert" aria-live="polite"' 'cart validation alert semantics exist'
Assert-Contains $app "localStorage.setItem('guest_email', email)" 'guest email persistence protected'
Assert-Contains $app "fetch('/api/cart/sync'" 'guest cart sync protected'
Assert-Contains $app "checkout.mutate" 'cart checkout mutation protected'

Assert-Contains $checkoutHook 'apiFetch.post("/orders"' 'order creation contract protected'
Assert-Contains $checkoutHook 'apiFetch.post("/checkout"' 'checkout creation contract protected'
Assert-Contains $checkoutHook "No pudimos iniciar el pago seguro" 'checkout missing URL guard exists'
Assert-Contains $checkoutHook "No pudimos iniciar el pago" 'checkout Spanish error exists'
Assert-NotContains $checkoutHook 'Error processing checkout' 'legacy checkout English error removed'

Assert-Contains $recoverCart 'data-mobile-ux-e="recover-cart-flow"' 'recover cart E marker exists'
Assert-Contains $recoverCart '/api/cart/recover?token=' 'recover cart endpoint protected'
Assert-Contains $orders 'data-mobile-ux-e="orders-checkout-flow"' 'orders E marker exists'
Assert-Contains $orders "apiClient.post('/checkout'" 'resume checkout endpoint protected'
Assert-Contains $orders 'No pudimos reanudar el pago' 'resume checkout error hardening exists'
Assert-Contains $trackOrder 'data-mobile-ux-e="order-flow-qa"' 'track order E marker exists'
Assert-Contains $trackOrder "localStorage.getItem('guest_email')" 'track order guest email prefill exists'
Assert-Contains $trackOrder '/orders/track?email=' 'track order endpoint protected'
Assert-Contains $checkoutSuccess 'data-mobile-ux-e="checkout-success-flow"' 'checkout success E marker exists'
Assert-Contains $checkoutSuccess 'clearCart();' 'checkout success cart clearing protected'
Assert-Contains $checkoutSuccess "searchParams.get('session_id')" 'Stripe session query preserved'

Assert-Contains $server "app.post('/api/orders'" 'server order endpoint protected'
Assert-Contains $server "app.post('/api/checkout'" 'server checkout endpoint protected'
Assert-Contains $server "app.post('/api/cart/sync'" 'server cart sync endpoint protected'
Assert-Contains $server "app.get('/api/cart/recover'" 'server cart recovery endpoint protected'
Assert-Contains $server "app.get('/api/orders/my'" 'server my orders endpoint protected'
Assert-Contains $server "app.get('/api/orders/track'" 'server tracking endpoint protected'
Assert-Contains $server '/checkout/success?session_id={CHECKOUT_SESSION_ID}' 'Stripe success URL protected'

Assert-Contains $css 'MOBILE/UX E' 'MOBILE UX E CSS marker exists'
Assert-Contains $css 'min-height: 48px' 'mobile checkout primary touch target exists'
Assert-Contains $css 'min-height: 46px' 'mobile commerce input touch target exists'
Assert-Contains $report 'MOBILE/UX F' 'next final regression phase recorded'

Write-Host 'PASS MOBILE/UX E - checkout cart order flow mobile QA checks'
