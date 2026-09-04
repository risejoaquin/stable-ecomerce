$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "src\pages\store\ProductDetailPage.tsx"
if (!(Test-Path $path)) { throw "Missing $path" }

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

function Replace-Exact([string]$Old, [string]$New, [string]$Marker) {
  if ($script:content.Contains($New)) {
    Write-Host "SKIP already applied: $Marker" -ForegroundColor Yellow
    return
  }
  if (-not $script:content.Contains($Old)) {
    throw "Patch anchor not found for $Marker"
  }
  $script:content = $script:content.Replace($Old, $New)
  Write-Host "PATCH $Marker" -ForegroundColor Green
}

# Restore Iteration 02: secondary-content deferral + LCP priority.
Replace-Exact `
  "import React, { useEffect, useState } from 'react';" `
  "import React, { Suspense, lazy, useEffect, useState } from 'react';" `
  "product lazy primitives"

Replace-Exact `
  "import { ReviewList } from '../../components/reviews/ReviewList';`n" `
  "" `
  "remove eager ReviewList import"

Replace-Exact `
  "import { ReviewForm } from '../../components/reviews/ReviewForm';`n" `
  "" `
  "remove eager ReviewForm import"

Replace-Exact `
  "export function ProductDetailPage() {" `
@"
const LazyReviewList = lazy(() =>
  import('../../components/reviews/ReviewList').then((module) => ({ default: module.ReviewList }))
);
const LazyReviewForm = lazy(() =>
  import('../../components/reviews/ReviewForm').then((module) => ({ default: module.ReviewForm }))
);

export function ProductDetailPage() {
"@ `
  "restore lazy review declarations"

Replace-Exact `
  "  const { data: ratingData } = useProductRating(id || '');" `
  "  const { data: ratingData } = useProductRating(secondaryContentReady ? (id || '') : '');" `
  "defer product rating request"

Replace-Exact `
  "  const [quantity, setQuantity] = useState(1);" `
@"
  const [quantity, setQuantity] = useState(1);
  const [secondaryContentReady, setSecondaryContentReady] = useState(false);
"@ `
  "restore secondary-content state"

$oldQueryBlock = @'
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.get(`/products/${id}`),
    enabled: !!id
  });

  useEffect(() => {
'@
$newQueryBlock = @'
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.get(`/products/${id}`),
    enabled: !!id
  });

  useEffect(() => {
    if (!product?.id) return;

    setSecondaryContentReady(false);
    const browser = window as any;
    const activateSecondaryContent = () => setSecondaryContentReady(true);

    if (typeof browser.requestIdleCallback === 'function') {
      const idleId = browser.requestIdleCallback(activateSecondaryContent, { timeout: 1500 });
      return () => browser.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(activateSecondaryContent, 750);
    return () => window.clearTimeout(timeoutId);
  }, [product?.id]);

  useEffect(() => {
'@
Replace-Exact $oldQueryBlock $newQueryBlock "restore idle secondary request gate"

Replace-Exact `
@'
  const { data: similarProductsResult } = useSearchProducts(
    store?.slug,
'@ `
@'
  const { data: similarProductsResult } = useSearchProducts(
    secondaryContentReady ? store?.slug : undefined,
'@ `
  "defer similar products request"

# Restore Iteration 03: do not block PDP render on store config.
Replace-Exact `
'  if (isStoreLoading || isProductLoading) return <div className="ss-editorial-shell uix-storefront-loading"><UixStatePanel tone="loading" title="Cargando producto" description="Estamos preparando los detalles, disponibilidad y opciones de compra." /></div>;' `
'  if (isProductLoading) return <div className="ss-editorial-shell uix-storefront-loading"><UixStatePanel tone="loading" title="Cargando producto" description="Estamos preparando los detalles, disponibilidad y opciones de compra." /></div>;' `
  "remove store config from critical PDP gate"

# Restore Iteration 02 image priority.
Replace-Exact `
'{product.images?.[selectedImageIndex] ? <img src={product.images[selectedImageIndex]} alt={product.name} /> : <div className="absolute inset-0 flex items-center justify-center opacity-40">Sin imagen</div>}' `
'{product.images?.[selectedImageIndex] ? <img src={product.images[selectedImageIndex]} alt={product.name} fetchPriority="high" loading="eager" decoding="async" /> : <div className="absolute inset-0 flex items-center justify-center opacity-40">Sin imagen</div>}' `
  "restore PDP primary LCP image priority"

Replace-Exact `
'<img src={img} alt={`${product.name} ${idx + 1}`} />' `
'<img src={img} alt={`${product.name} ${idx + 1}`} loading="lazy" fetchPriority="low" decoding="async" />' `
  "restore thumbnail lazy low priority"

# Restore Iteration 05 lazy review rendering.
Replace-Exact `
'<div className="lg:col-span-2"><ReviewList productId={product.id} themeColor="#0b0b0a" /></div>' `
'<div className="lg:col-span-2"><Suspense fallback={null}><LazyReviewList productId={product.id} themeColor="#0b0b0a" /></Suspense></div>' `
  "restore lazy ReviewList render"

Replace-Exact `
'<ReviewForm productId={product.id} themeColor="#0b0b0a" />' `
'<Suspense fallback={null}><LazyReviewForm productId={product.id} themeColor="#0b0b0a" /></Suspense>' `
  "restore lazy ReviewForm render"

[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 06 applied" -ForegroundColor Green
