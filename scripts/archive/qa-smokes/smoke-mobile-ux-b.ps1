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

function Assert-NotContains([string]$Path, [string]$Needle, [string]$Label) {
    if (Select-String -Path $Path -Pattern ([regex]::Escape($Needle)) -Quiet) {
        throw "FAIL $Label - unexpected '$Needle' in $Path"
    }
    Write-Host "PASS $Label"
}

$root = Resolve-Path (Join-Path $PSScriptRoot '../..')
Set-Location $root

$report = 'docs/design/MOBILE_UX_B_STOREFRONT_MOBILE_ADAPTABILITY.md'
$homePage = 'src/pages/store/HomePage.tsx'
$product = 'src/pages/store/ProductDetailPage.tsx'
$css = 'src/styles/uix-soft-premium-system.css'
$app = 'src/App.tsx'

Assert-FileExists $report 'MOBILE UX B report exists'
Assert-FileExists $homePage 'home source exists'
Assert-FileExists $product 'product detail source exists'
Assert-FileExists 'src/components/editorial/EditorialHeader.tsx' 'editorial header protected'
Assert-FileExists 'src/components/editorial/MobileEditorialNav.tsx' 'mobile editorial nav protected'
Assert-FileExists 'src/components/uix/UixStatePanel.tsx' 'UIX state panel protected'
Assert-FileExists 'public/sw.js' 'service worker protected'
Assert-FileExists 'src/routes/lazy-routes.tsx' 'lazy routes protected'

Assert-Contains $homePage 'useSearchParams' 'catalog query params enabled'
Assert-Contains $homePage 'uix-mobile-filter-trigger' 'mobile catalog filter trigger exists'
Assert-Contains $homePage 'UixStatePanel' 'home loading and empty states use UIX'
Assert-Contains 'src/components/storefront/SearchBar.tsx' 'aria-label="Limpiar' 'search clear accessibility exists'
Assert-Contains 'src/components/storefront/ProductFilters.tsx' 'Limpiar filtros' 'catalog reset action exists'
Assert-Contains 'src/components/storefront/Pagination.tsx' 'aria-current' 'pagination accessibility exists'

Assert-Contains $product 'UixStatePanel' 'product detail states use UIX'
Assert-Contains $css '.ss-buy-row { position: sticky;' 'mobile product CTA sticky rule exists'
Assert-Contains $css '.uix-mobile-catalog-tools' 'mobile catalog tool styles exist'
Assert-Contains $css '.ss-filter-rail.is-mobile-open' 'mobile filter panel styles exist'

Assert-Contains 'src/pages/legal/ContactPage.tsx' 'UixPageShell' 'contact uses premium shell'
Assert-Contains 'src/pages/legal/PrivacyPolicyPage.tsx' 'UixPageShell' 'privacy uses premium shell'
Assert-Contains 'src/pages/legal/ReturnPolicyPage.tsx' 'UixPageShell' 'returns uses premium shell'
Assert-Contains 'src/pages/legal/TermsAndConditionsPage.tsx' 'UixPageShell' 'terms uses premium shell'
Assert-Contains 'src/pages/NotFoundPage.tsx' 'UixPageShell' 'not found uses premium shell'

Assert-NotContains 'src/pages/legal/ContactPage.tsx' 'Your name' 'contact old English placeholder removed'
Assert-NotContains 'src/pages/legal/ContactPage.tsx' 'How can we help?' 'contact old English message removed'
Assert-NotContains 'src/pages/NotFoundPage.tsx' 'Page Not Found' '404 old English UI removed'
Assert-NotContains 'src/pages/legal/PrivacyPolicyPage.tsx' 'We collect information' 'privacy old English content removed'
Assert-NotContains 'src/pages/legal/ReturnPolicyPage.tsx' 'You have 30 calendar days' 'returns old English content removed'
Assert-NotContains 'src/pages/legal/TermsAndConditionsPage.tsx' 'By accessing and using this website' 'terms old English content removed'

Assert-Contains $app 'aria-modal="true"' 'cart drawer dialog semantics exist'
Assert-Contains $app "event.key === 'Escape'" 'cart drawer Escape close exists'
Assert-Contains $app "document.body.style.overflow = 'hidden'" 'cart drawer scroll lock exists'
Assert-Contains $app 'Cerrar carrito' 'cart drawer close label exists'

Assert-Contains $report 'MOBILE/UX C' 'next account phase recorded'
Assert-Contains $report 'TrackOrderPage' 'track order deferral documented'

Write-Host 'PASS MOBILE/UX B - storefront mobile adaptability checks'
