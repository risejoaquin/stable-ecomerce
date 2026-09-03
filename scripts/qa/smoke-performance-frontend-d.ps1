$ErrorActionPreference = "Stop"

function Assert-FileContains($Path, $Pattern, $Message) {
  if (!(Test-Path $Path)) { throw "FAIL $Message - missing file $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

Assert-FileContains "src/routes/lazy-routes.tsx" "LazyAdminDashboard" "lazy routes module exists"
Assert-FileContains "src/App.tsx" "Suspense" "App uses React Suspense"
Assert-FileContains "src/App.tsx" "RouteLoadingFallback" "route loading fallback exists"
Assert-FileContains "src/App.tsx" "LazyAdminDashboard" "admin dashboard route lazy loaded"
Assert-FileContains "src/App.tsx" "LazyAdminEmailCenterPage" "email center route lazy loaded"
Assert-FileContains "src/App.tsx" "LazyHomePage" "storefront home route lazy loaded"
Assert-FileContains "src/App.tsx" "LazyProductDetailPage" "product detail route lazy loaded"
Assert-FileContains "vite.config.ts" "manualChunks" "vite manualChunks configured"
Assert-FileContains "vite.config.ts" "vendor-react" "react vendor chunk configured"
Assert-FileContains "vite.config.ts" "admin-pages" "admin page chunk configured"
Assert-FileContains "vite.config.ts" "storefront-pages" "storefront page chunk configured"
Assert-FileContains "src/styles/uix-soft-premium-system.css" "PERFORMANCE/FRONTEND D" "performance loading CSS marker exists"
Assert-FileContains "docs/performance/PERFORMANCE_FRONTEND_D_BUNDLE_ROUTE_SPLITTING.md" "Bundle Optimization" "performance frontend D documentation exists"

Write-Host "PASS performance frontend D bundle route splitting checks"
