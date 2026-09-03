$ErrorActionPreference = 'Stop'

function Assert-FileExists([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path)) { throw "FAIL $Label - missing $Path" }
    Write-Host "PASS $Label"
}

function Assert-Contains([string]$Path, [string]$Needle, [string]$Label) {
    if (-not (Select-String -Path $Path -SimpleMatch $Needle -Quiet)) { throw "FAIL $Label - '$Needle' not found in $Path" }
    Write-Host "PASS $Label"
}

function Assert-NotContains([string]$Path, [string]$Needle, [string]$Label) {
    if (Select-String -Path $Path -SimpleMatch $Needle -Quiet) { throw "FAIL $Label - legacy '$Needle' found in $Path" }
    Write-Host "PASS $Label"
}

$css = 'src/styles/uix-soft-premium-system.css'
$nav = 'src/components/admin/uix/AdminCommandNav.tsx'
$products = 'src/pages/admin/ProductsPage.tsx'
$orders = 'src/pages/admin/AdminOrdersPage.tsx'
$customers = 'src/pages/admin/AdminCustomersPage.tsx'
$categories = 'src/pages/admin/AdminCategoriesPage.tsx'
$coupons = 'src/pages/admin/CouponsPage.tsx'
$commercial = 'src/pages/admin/AdminCommercialPage.tsx'
$emailCenter = 'src/pages/admin/AdminEmailCenterPage.tsx'
$settings = 'src/pages/admin/AdminSettingsPage.tsx'
$productTable = 'src/components/admin/ProductTable.tsx'
$productModal = 'src/components/admin/ProductFormModal.tsx'
$report = 'docs/design/MOBILE_UX_D_ADMIN_MOBILE_TABLET_ADAPTABILITY.md'

Assert-FileExists $report 'MOBILE UX D report exists'
Assert-FileExists $nav 'admin command nav exists'
Assert-FileExists $products 'admin products exists'
Assert-FileExists $orders 'admin orders exists'
Assert-FileExists $customers 'admin customers exists'
Assert-FileExists $categories 'admin categories exists'
Assert-FileExists $coupons 'admin coupons exists'
Assert-FileExists $commercial 'admin commercial exists'
Assert-FileExists $emailCenter 'admin email center exists'
Assert-FileExists $settings 'admin settings exists'

Assert-Contains $nav 'data-mobile-ux-d="admin-nav"' 'admin nav phase marker exists'
Assert-Contains $nav 'aria-current=' 'admin nav active page accessibility exists'
Assert-Contains $css 'MOBILE/UX D: Admin Mobile/Tablet Adaptability' 'MOBILE UX D CSS marker exists'
Assert-Contains $css '@media (max-width: 1180px)' 'tablet admin breakpoint exists'
Assert-Contains $css '@media (max-width: 820px)' 'tablet portrait admin breakpoint exists'
Assert-Contains $css '@media (max-width: 560px)' 'small mobile admin breakpoint exists'
Assert-Contains $css '.uix-admin-table-scroll' 'admin table touch scroll exists'
Assert-Contains $css '.uix-admin-modal-card' 'admin responsive modal styles exist'

Assert-Contains $products 'data-mobile-ux-d="products"' 'products responsive phase marker exists'
Assert-Contains $orders 'data-mobile-ux-d="orders"' 'orders responsive phase marker exists'
Assert-Contains $customers 'data-mobile-ux-d="customers"' 'customers responsive phase marker exists'
Assert-Contains $categories 'data-mobile-ux-d="categories"' 'categories responsive phase marker exists'
Assert-Contains $coupons 'data-mobile-ux-d="coupons"' 'coupons responsive phase marker exists'
Assert-Contains $commercial 'data-mobile-ux-d="commercial"' 'commercial responsive phase marker exists'
Assert-Contains $emailCenter 'data-mobile-ux-d="email-center"' 'email center responsive phase marker exists'
Assert-Contains $settings 'data-mobile-ux-d="settings"' 'settings responsive phase marker exists'

Assert-Contains $productTable 'uix-admin-table-scroll' 'products table touch scroll exists'
Assert-Contains $productModal 'aria-modal="true"' 'product modal dialog semantics exist'
Assert-Contains $productModal 'uix-admin-modal-card' 'product modal responsive class exists'
Assert-NotContains $products '>Products</h2>' 'products legacy English heading removed'
Assert-NotContains $products '<p>Loading...</p>' 'products legacy loading removed'
Assert-NotContains $coupons 'Loading coupons...' 'coupons legacy loading removed'
Assert-NotContains $orders 'Loading orders...' 'orders legacy loading removed'
Assert-NotContains $commercial 'Checkout started' 'commercial legacy funnel label removed'

Assert-Contains 'public/sw.js' 'offline' 'service worker protected'
Assert-Contains 'src/routes/lazy-routes.tsx' 'LazyAdminDashboard' 'admin lazy routes protected'
Assert-Contains $report 'MOBILE/UX E' 'next checkout flow phase recorded'

Write-Host 'PASS MOBILE/UX D - admin mobile tablet adaptability checks'
