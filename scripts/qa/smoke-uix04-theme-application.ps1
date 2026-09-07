Write-Host "Checking UIX04 soft premium theme files..." -ForegroundColor Cyan
$required = @(
  "src/styles/soft-beauty-theme.css",
  "src/pages/store/ProfilePage.tsx",
  "src/pages/store/HomePage.tsx",
  "src/pages/store/ProductDetailPage.tsx",
  "src/components/editorial/EditorialHeader.tsx",
  "src/components/editorial/EditorialProductCard.tsx",
  "docs/design/UIX04_SOFT_PREMIUM_THEME_APPLICATION.md",
  "docs/design/UIX04_ADMIN_THEME_GUIDE.md"
)
foreach ($file in $required) {
  if (!(Test-Path $file)) {
    throw "Missing required UIX04 file: $file"
  }
  Write-Host "PASS $file" -ForegroundColor Green
}

$main = Get-Content "src/main.tsx" -Raw
if ($main -notmatch "soft-beauty-theme.css") { throw "soft-beauty-theme.css is not imported in src/main.tsx" }
Write-Host "PASS theme stylesheet import" -ForegroundColor Green

$app = Get-Content "src/App.tsx" -Raw
if ($app -notmatch "ss-admin-shell") { throw "Admin layout was not themed with ss-admin-shell" }
Write-Host "PASS admin shell theme class" -ForegroundColor Green

$profile = Get-Content "src/pages/store/ProfilePage.tsx" -Raw
foreach ($term in @("Pedidos recientes", "Reordenar sugerencias", "Direcciones guardadas", "Métodos de pago", "Soporte", "Preferencias y seguridad")) {
  if ($profile -notmatch [regex]::Escape($term)) { throw "Profile panel missing: $term" }
}
Write-Host "PASS customer profile panels" -ForegroundColor Green
Write-Host "PASS UIX04 soft premium theme smoke checks" -ForegroundColor Green
