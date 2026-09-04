
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Replace-Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Marker
  )

  if (!(Test-Path $Path)) { throw "Missing file: $Path" }

  $content = Get-Content $Path -Raw

  if ($content.Contains($New)) {
    Write-Host "SKIP already applied: $Marker" -ForegroundColor Yellow
    return
  }

  if (!$content.Contains($Old)) {
    throw "Patch anchor not found for $Marker in $Path"
  }

  $content = $content.Replace($Old, $New)
  Set-Content -Path $Path -Value $content -Encoding UTF8
  Write-Host "PATCH $Marker" -ForegroundColor Green
}

# HOME: rollback forced hero priority because post-change Lighthouse showed no
# mobile LCP improvement and a clear desktop regression.
Replace-Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old '{heroProduct?.images?.[0] ? <img src={heroProduct.images[0]} alt={heroProduct.name} fetchPriority="high" loading="eager" decoding="async" /> : <div className="absolute inset-0 flex items-center justify-center ss-display text-6xl opacity-20">SELFCARE</div>}' `
  -New '{heroProduct?.images?.[0] ? <img src={heroProduct.images[0]} alt={heroProduct.name} /> : <div className="absolute inset-0 flex items-center justify-center ss-display text-6xl opacity-20">SELFCARE</div>}' `
  -Marker "rollback home forced hero priority"

# PRODUCT DETAIL: only the product request is critical to first render.
# Store config already has a safe fallback via currentStore and can hydrate later.
Replace-Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old '  if (isStoreLoading || isProductLoading) return <div className="ss-editorial-shell uix-storefront-loading"><UixStatePanel tone="loading" title="Cargando producto" description="Estamos preparando los detalles, disponibilidad y opciones de compra." /></div>;' `
  -New '  if (isProductLoading) return <div className="ss-editorial-shell uix-storefront-loading"><UixStatePanel tone="loading" title="Cargando producto" description="Estamos preparando los detalles, disponibilidad y opciones de compra." /></div>;' `
  -Marker "remove store config from critical product render gate"

Write-Host "PASS POST-UX C Iteration 03 patch applied" -ForegroundColor Green
