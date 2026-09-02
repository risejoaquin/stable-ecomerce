Write-Host "MACRO UI C — Final Visual QA Checklist" -ForegroundColor Cyan
$required = @(
  "src/styles/final-visual-polish.css",
  "src/styles/premium-storefront.css",
  "src/styles/checkout-conversion.css",
  "src/components/visual/FinalVisualQAPanel.tsx",
  "docs/design/MACRO_UI_C_FINAL_VISUAL_QA.md",
  "docs/design/UI_C_SCREEN_CHECKLIST.md",
  "docs/design/UI_C_MOBILE_CHECKLIST.md",
  "docs/design/UI_C_CONVERSION_POLISH.md",
  "docs/design/UI_C_FINAL_DESIGN_SYSTEM_FREEZE.md"
)
foreach ($file in $required) {
  if (!(Test-Path $file)) {
    throw "Missing required UI C file: $file"
  }
  Write-Host "PASS $file" -ForegroundColor Green
}
Write-Host "Run manually: npm install; npm run build; npm run dev" -ForegroundColor Yellow
Write-Host "Review: Home, catalog, product detail, cart, checkout, confirmation, tracking, login, profile, wishlist, mobile." -ForegroundColor Yellow
Write-Host "PASS UI C visual checklist files" -ForegroundColor Green
