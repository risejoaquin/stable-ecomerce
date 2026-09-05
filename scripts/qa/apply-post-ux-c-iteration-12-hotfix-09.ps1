$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$path) {
  return [System.IO.File]::ReadAllText((Resolve-Path $path).Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText((Resolve-Path $path).Path, $content, $utf8NoBom)
}

function Replace-Exact([string]$path, [string]$old, [string]$new, [string]$label) {
  $content = Read-Utf8 $path

  if ($content.Contains($new)) {
    Write-Host "SKIP already applied: $label" -ForegroundColor Yellow
    return
  }

  if (!$content.Contains($old)) {
    throw "Expected anchor not found for '$label' in $path"
  }

  $content = $content.Replace($old, $new)
  Write-Utf8 $path $content
  Write-Host "PATCH $label" -ForegroundColor Green
}

# 1. App.tsx: direct import of PDP and remove LazyProductDetailPage from lazy imports.
$appPath = "src\App.tsx"

Replace-Exact $appPath `
  "import { AdminCommandNav } from './components/admin/uix/AdminCommandNav';" `
  "import { AdminCommandNav } from './components/admin/uix/AdminCommandNav';`nimport { ProductDetailPage } from './pages/store/ProductDetailPage';" `
  "direct ProductDetailPage import"

Replace-Exact $appPath `
  "  LazyPrivacyPolicyPage,`n  LazyProductDetailPage,`n  LazyProductsPage," `
  "  LazyPrivacyPolicyPage,`n  LazyProductsPage," `
  "remove LazyProductDetailPage import"

Replace-Exact $appPath `
  '<Route path="/product/:id" element={<LazyProductDetailPage />} />' `
  '<Route path="/product/:id" element={<ProductDetailPage />} />' `
  "eager product id route"

Replace-Exact $appPath `
  '<Route path="/product/:id/:slug" element={<LazyProductDetailPage />} />' `
  '<Route path="/product/:id/:slug" element={<ProductDetailPage />} />' `
  "eager product slug route"

# 2. lazy-routes.tsx: remove PDP dynamic import so Vite no longer creates a route chunk for it.
$lazyPath = "src\routes\lazy-routes.tsx"
Replace-Exact $lazyPath `
  "export const LazyProductDetailPage = lazyNamed(() => import('../pages/store/ProductDetailPage'), 'ProductDetailPage');`n" `
  "" `
  "remove ProductDetailPage lazy export"

# 3. index.html: preconnect to Supabase Storage origin.
$indexPath = "index.html"
Replace-Exact $indexPath `
  '    <link rel="preconnect" href="https://fonts.googleapis.com">' `
  "    <link rel=`"preconnect`" href=`"https://dporfgsbwsyqzmlnqrug.supabase.co`" crossorigin>`n    <link rel=`"preconnect`" href=`"https://fonts.googleapis.com`">" `
  "Supabase storage preconnect"

Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 09 applied" -ForegroundColor Green
