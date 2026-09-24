$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "src/styles/skoot-editorial-redesign.css",
  "src/components/editorial/EditorialHeader.tsx",
  "src/components/editorial/EditorialProductCard.tsx",
  "src/components/editorial/EditorialLookbookSection.tsx",
  "src/components/editorial/EditorialFooter.tsx",
  "src/components/editorial/MobileEditorialNav.tsx",
  "src/pages/store/HomePage.tsx",
  "src/pages/store/ProductDetailPage.tsx",
  "docs/design/MACRO_UI_D_SKOOT_INSPIRED_EDITORIAL_STOREFRONT_REDESIGN.md",
  "docs/design/UI_D_EDITORIAL_COMPONENT_GUIDE.md",
  "docs/design/UI_D_VISUAL_QA_CHECKLIST.md"
)

foreach ($file in $requiredFiles) {
  if (!(Test-Path $file)) {
    throw "Missing required UI D file: $file"
  }
  Write-Host "PASS exists -> $file"
}

$css = Get-Content "src/styles/skoot-editorial-redesign.css" -Raw
foreach ($token in @("ss-editorial-shell", "ss-hero", "ss-collection-grid", "ss-product-card", "ss-mobile-nav")) {
  if ($css -notmatch $token) { throw "Missing CSS token: $token" }
  Write-Host "PASS CSS token -> $token"
}

$home = Get-Content "src/pages/store/HomePage.tsx" -Raw
foreach ($token in @("EditorialHeader", "EditorialProductCard", "EditorialLookbookSection", "MobileEditorialNav")) {
  if ($home -notmatch $token) { throw "HomePage missing editorial token: $token" }
  Write-Host "PASS Home editorial token -> $token"
}

$product = Get-Content "src/pages/store/ProductDetailPage.tsx" -Raw
foreach ($token in @("ss-product-detail-layout", "Add to bag", "EditorialFooter", "ReviewList")) {
  if ($product -notmatch $token) { throw "ProductDetail missing editorial token: $token" }
  Write-Host "PASS Product detail token -> $token"
}

Write-Host "PASS UI D editorial visual checklist"
