$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Replace-Utf8Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Marker
  )

  if (!(Test-Path $Path)) { throw "Missing file: $Path" }

  $full = (Resolve-Path $Path).Path
  $content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

  if ($content.Contains($New)) {
    Write-Host "SKIP already applied: $Marker" -ForegroundColor Yellow
    return
  }

  if (!$content.Contains($Old)) {
    throw "Patch anchor not found for $Marker in $Path"
  }

  $content = $content.Replace($Old, $New)
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH $Marker" -ForegroundColor Green
}

# HOME: React lazy primitives.
Replace-Utf8Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old "import React, { useEffect, useState } from 'react';" `
  -New "import React, { Suspense, lazy, useEffect, useState } from 'react';" `
  -Marker "home lazy primitives"

# HOME: remove eager below-fold imports.
foreach ($entry in @(
  @("import { EditorialLookbookSection } from '../../components/editorial/EditorialLookbookSection';", "home lookbook eager import"),
  @("import { RoutineCards } from '../../components/storefront/uix/RoutineCards';", "home routine eager import"),
  @("import { ShopByConcern } from '../../components/storefront/uix/ShopByConcern';", "home concern eager import"),
  @("import { StorefrontNewsletter } from '../../components/storefront/uix/StorefrontNewsletter';", "home newsletter eager import")
)) {
  Replace-Utf8Exact `
    -Path "src\pages\store\HomePage.tsx" `
    -Old $entry[0] `
    -New "" `
    -Marker $entry[1]
}

# HOME: lazy declarations inserted before brand constant.
Replace-Utf8Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old "const DEFAULT_BRAND = 'Selfcare Sinners';" `
  -New @"
const LazyEditorialLookbookSection = lazy(() =>
  import('../../components/editorial/EditorialLookbookSection').then((module) => ({ default: module.EditorialLookbookSection }))
);
const LazyRoutineCards = lazy(() =>
  import('../../components/storefront/uix/RoutineCards').then((module) => ({ default: module.RoutineCards }))
);
const LazyShopByConcern = lazy(() =>
  import('../../components/storefront/uix/ShopByConcern').then((module) => ({ default: module.ShopByConcern }))
);
const LazyStorefrontNewsletter = lazy(() =>
  import('../../components/storefront/uix/StorefrontNewsletter').then((module) => ({ default: module.StorefrontNewsletter }))
);

const DEFAULT_BRAND = 'Selfcare Sinners';
"@ `
  -Marker "home below-fold lazy declarations"

Replace-Utf8Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old "<RoutineCards />" `
  -New "<Suspense fallback={null}><LazyRoutineCards /></Suspense>" `
  -Marker "home routine lazy render"

Replace-Utf8Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old "<ShopByConcern />" `
  -New "<Suspense fallback={null}><LazyShopByConcern /></Suspense>" `
  -Marker "home concern lazy render"

Replace-Utf8Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old "<EditorialLookbookSection />" `
  -New "<Suspense fallback={null}><LazyEditorialLookbookSection /></Suspense>" `
  -Marker "home lookbook lazy render"

Replace-Utf8Exact `
  -Path "src\pages\store\HomePage.tsx" `
  -Old "<StorefrontNewsletter />" `
  -New "<Suspense fallback={null}><LazyStorefrontNewsletter /></Suspense>" `
  -Marker "home newsletter lazy render"

# PRODUCT: React lazy primitives.
Replace-Utf8Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old "import React, { useEffect, useState } from 'react';" `
  -New "import React, { Suspense, lazy, useEffect, useState } from 'react';" `
  -Marker "product lazy primitives"

# PRODUCT: remove eager review imports.
foreach ($entry in @(
  @("import { ReviewList } from '../../components/reviews/ReviewList';", "product review list eager import"),
  @("import { ReviewForm } from '../../components/reviews/ReviewForm';", "product review form eager import")
)) {
  Replace-Utf8Exact `
    -Path "src\pages\store\ProductDetailPage.tsx" `
    -Old $entry[0] `
    -New "" `
    -Marker $entry[1]
}

Replace-Utf8Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old "export function ProductDetailPage() {" `
  -New @"
const LazyReviewList = lazy(() =>
  import('../../components/reviews/ReviewList').then((module) => ({ default: module.ReviewList }))
);
const LazyReviewForm = lazy(() =>
  import('../../components/reviews/ReviewForm').then((module) => ({ default: module.ReviewForm }))
);

export function ProductDetailPage() {
"@ `
  -Marker "product review lazy declarations"

Replace-Utf8Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old '<div className="lg:col-span-2"><ReviewList productId={product.id} themeColor="#0b0b0a" /></div>' `
  -New '<div className="lg:col-span-2"><Suspense fallback={null}><LazyReviewList productId={product.id} themeColor="#0b0b0a" /></Suspense></div>' `
  -Marker "product review list lazy render"

# Product review form: replace only the component token so surrounding UTF-8 copy is untouched.
Replace-Utf8Exact `
  -Path "src\pages\store\ProductDetailPage.tsx" `
  -Old '<ReviewForm productId={product.id} themeColor="#0b0b0a" />' `
  -New '<Suspense fallback={null}><LazyReviewForm productId={product.id} themeColor="#0b0b0a" /></Suspense>' `
  -Marker "product review form lazy render"

Write-Host "PASS POST-UX C Iteration 05 patch applied" -ForegroundColor Green
