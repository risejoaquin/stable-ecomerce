param(
  [string]$BaseUrl = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail($message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }
function Assert-File($path, $message) { if (Test-Path $path) { Pass $message } else { Fail "$message ($path)" } }
function Assert-ContainsLiteral($path, $text, $message) {
  if (!(Test-Path $path)) { Fail "$message ($path missing)" }
  $content = Get-Content $path -Raw
  if ($content.Contains($text)) { Pass $message } else { Fail "$message ($path missing text: $text)" }
}

Assert-File "docs\design\MOBILE_UX_F_FINAL_VISUAL_REGRESSION_CLOSURE.md" "MOBILE UX F report exists"
Assert-File "src\components\uix\UixPageShell.tsx" "UIX page shell exists"
Assert-File "src\pages\store\HomePage.tsx" "home source exists"
Assert-File "src\components\editorial\MobileEditorialNav.tsx" "mobile editorial nav exists"
Assert-File "public\sw.js" "service worker exists"
Assert-File "src\routes\lazy-routes.tsx" "lazy routes protected"

Assert-ContainsLiteral "src\components\uix\UixPageShell.tsx" 'data-mobile-ux-f="final-regression-shell"' "account shell F marker exists"
Assert-ContainsLiteral "src\components\uix\UixPageShell.tsx" "uix-skip-link" "account skip link exists"
Assert-ContainsLiteral "src\components\uix\UixPageShell.tsx" 'id="uix-main-content"' "account main landmark target exists"
Assert-ContainsLiteral "src\pages\store\HomePage.tsx" 'data-mobile-ux-f="storefront-final-regression"' "storefront F marker exists"
Assert-ContainsLiteral "src\pages\store\HomePage.tsx" 'href="#shop"' "storefront skip link exists"
Assert-ContainsLiteral "src\App.tsx" 'data-mobile-ux-f="admin-final-regression"' "admin F marker exists"
Assert-ContainsLiteral "src\App.tsx" 'id="uix-admin-content"' "admin main landmark target exists"
Assert-ContainsLiteral "src\components\editorial\MobileEditorialNav.tsx" "Abrir bolsa con" "mobile cart accessible label exists"

$css = "src\styles\uix-soft-premium-system.css"
Assert-ContainsLiteral $css "MOBILE/UX F" "MOBILE UX F CSS marker exists"
Assert-ContainsLiteral $css "@media (max-width: 1024px)" "1024 breakpoint protected"
Assert-ContainsLiteral $css "@media (max-width: 820px)" "820 breakpoint protected"
Assert-ContainsLiteral $css "@media (max-width: 640px)" "640 breakpoint protected"
Assert-ContainsLiteral $css "@media (max-width: 430px)" "430 breakpoint protected"
Assert-ContainsLiteral $css "@media (max-width: 360px)" "360 small mobile breakpoint exists"
Assert-ContainsLiteral $css "prefers-reduced-motion: reduce" "reduced motion policy exists"
Assert-ContainsLiteral $css "env(safe-area-inset-bottom)" "mobile safe area protection exists"
Assert-ContainsLiteral $css "font-size: 16px" "mobile input zoom guard exists"
Assert-ContainsLiteral $css "overflow-x: hidden" "global horizontal overflow guard exists"
Assert-ContainsLiteral $css "max-height: 100dvh" "mobile modal viewport guard exists"

Assert-ContainsLiteral "public\sw.js" "cached || caches.match('/') || offlineHtmlResponse()" "service worker response fallback protected"
Assert-ContainsLiteral "public\sw.js" "!url.search" "service worker query-param guard protected"
Assert-ContainsLiteral "vite.config.ts" "manualChunks" "Vite manual chunks protected"
Assert-ContainsLiteral "src\hooks\useCheckout.ts" "/checkout" "checkout contract protected"
Assert-ContainsLiteral "src\pages\store\CheckoutSuccessPage.tsx" "session_id" "Stripe session success flow protected"
Assert-ContainsLiteral "src\pages\store\TrackOrderPage.tsx" "/orders/track" "tracking contract protected"

if ($BaseUrl.Trim().Length -gt 0) {
  $base = $BaseUrl.TrimEnd('/')
  $paths = @('/', '/faq', '/privacy', '/returns', '/terms', '/track')
  foreach ($path in $paths) {
    try {
      $response = Invoke-WebRequest -Uri ($base + $path) -UseBasicParsing -TimeoutSec 20
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        Pass "production route responds $path"
      } else {
        Fail "production route $path returned $($response.StatusCode)"
      }
    } catch {
      Fail "production route request failed $path : $($_.Exception.Message)"
    }
  }
}

Pass "MOBILE/UX F - final visual regression closure checks"
