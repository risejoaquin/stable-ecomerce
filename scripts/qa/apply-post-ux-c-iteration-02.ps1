
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

Replace-Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old '{heroProduct?.images?.[0] ? <img src={heroProduct.images[0]} alt={heroProduct.name} /> : <div className="absolute inset-0 flex items-center justify-center ss-display text-6xl opacity-20">SELFCARE</div>}' `
  -New '{heroProduct?.images?.[0] ? <img src={heroProduct.images[0]} alt={heroProduct.name} fetchPriority="high" loading="eager" decoding="async" /> : <div className="absolute inset-0 flex items-center justify-center ss-display text-6xl opacity-20">SELFCARE</div>}' `
  -Marker "home hero LCP priority"

Replace-Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old '  const [quantity, setQuantity] = useState(1);' `
  -New @'
  const [quantity, setQuantity] = useState(1);
  const [secondaryContentReady, setSecondaryContentReady] = useState(false);
'@ `
  -Marker "product secondary-content state"

Replace-Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old '  const { data: ratingData } = useProductRating(id || '''');' `
  -New '  const { data: ratingData } = useProductRating(secondaryContentReady ? (id || '''') : '''');' `
  -Marker "defer product rating request"

Replace-Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old @'
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.get(`/products/${id}`),
    enabled: !!id
  });

  useEffect(() => {
'@ `
  -New @'
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
'@ `
  -Marker "defer secondary product requests until idle"

Replace-Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old @'
  const { data: similarProductsResult } = useSearchProducts(
    store?.slug,
'@ `
  -New @'
  const { data: similarProductsResult } = useSearchProducts(
    secondaryContentReady ? store?.slug : undefined,
'@ `
  -Marker "defer similar products request"

Replace-Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old '{product.images?.[selectedImageIndex] ? <img src={product.images[selectedImageIndex]} alt={product.name} /> : <div className="absolute inset-0 flex items-center justify-center opacity-40">Sin imagen</div>}' `
  -New '{product.images?.[selectedImageIndex] ? <img src={product.images[selectedImageIndex]} alt={product.name} fetchPriority="high" loading="eager" decoding="async" /> : <div className="absolute inset-0 flex items-center justify-center opacity-40">Sin imagen</div>}' `
  -Marker "product primary LCP image priority"

Replace-Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old '<img src={img} alt={`${product.name} ${idx + 1}`} />' `
  -New '<img src={img} alt={`${product.name} ${idx + 1}`} loading="lazy" fetchPriority="low" decoding="async" />' `
  -Marker "product thumbnail lazy low priority"

Write-Host "PASS POST-UX C Iteration 02 patch applied" -ForegroundColor Green
