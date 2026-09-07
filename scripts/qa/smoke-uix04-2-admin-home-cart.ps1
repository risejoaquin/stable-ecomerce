$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "src/pages/admin/AdminDashboard.tsx",
  "src/App.tsx",
  "src/pages/store/HomePage.tsx",
  "src/styles/soft-beauty-theme.css",
  "docs/design/UIX04_2_ADMIN_HOME_CART_ORGANIZATION_HOTFIX.md"
)

foreach ($file in $requiredFiles) {
  if (!(Test-Path $file)) {
    throw "Missing required file: $file"
  }
  Write-Host "PASS file exists -> $file"
}

$css = Get-Content "src/styles/soft-beauty-theme.css" -Raw
$admin = Get-Content "src/pages/admin/AdminDashboard.tsx" -Raw
$app = Get-Content "src/App.tsx" -Raw
$home = Get-Content "src/pages/store/HomePage.tsx" -Raw

$checks = @(
  @{Name="Cart icon inherits visible currentColor"; Text=".ss-editorial-cart-button svg"; Source=$css},
  @{Name="Cart SVG fill disabled"; Text="fill: none !important"; Source=$css},
  @{Name="Admin dashboard organized shell"; Text="ss-admin-dashboard"; Source=$admin},
  @{Name="Admin hero command center"; Text="Panel ejecutivo de tienda"; Source=$admin},
  @{Name="Admin grouped navigation"; Text="ss-admin-nav-group"; Source=$app},
  @{Name="Homepage curated benefit row"; Text="ss-home-curated-row"; Source=$home},
  @{Name="Homepage editorial grid"; Text="ss-home-editorial-grid"; Source=$home}
)

foreach ($check in $checks) {
  if ($check.Source -notlike "*$($check.Text)*") {
    throw "Missing visual check: $($check.Name)"
  }
  Write-Host "PASS $($check.Name)"
}

Write-Host "PASS UIX04.2 admin/home/cart visual hotfix checks"
