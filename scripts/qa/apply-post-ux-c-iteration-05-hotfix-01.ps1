$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Remove-Utf8Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$Marker
  )

  if (!(Test-Path $Path)) {
    throw "Missing file: $Path"
  }

  $full = (Resolve-Path $Path).Path
  $content = [System.IO.File]::ReadAllText(
    $full,
    [System.Text.Encoding]::UTF8
  )

  if (!$content.Contains($Old)) {
    Write-Host "SKIP already removed: $Marker" -ForegroundColor Yellow
    return
  }

  $content = $content.Replace($Old, "")
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

  Write-Host "PATCH removed: $Marker" -ForegroundColor Green
}

foreach ($entry in @(
  @(
    "src\pages\store\HomePage.tsx",
    "import { EditorialLookbookSection } from '../../components/editorial/EditorialLookbookSection';",
    "home lookbook eager import"
  ),
  @(
    "src\pages\store\HomePage.tsx",
    "import { RoutineCards } from '../../components/storefront/uix/RoutineCards';",
    "home routine eager import"
  ),
  @(
    "src\pages\store\HomePage.tsx",
    "import { ShopByConcern } from '../../components/storefront/uix/ShopByConcern';",
    "home concern eager import"
  ),
  @(
    "src\pages\store\HomePage.tsx",
    "import { StorefrontNewsletter } from '../../components/storefront/uix/StorefrontNewsletter';",
    "home newsletter eager import"
  ),
  @(
    "src\pages\store\ProductDetailPage.tsx",
    "import { ReviewList } from '../../components/reviews/ReviewList';",
    "product review list eager import"
  ),
  @(
    "src\pages\store\ProductDetailPage.tsx",
    "import { ReviewForm } from '../../components/reviews/ReviewForm';",
    "product review form eager import"
  )
)) {
  Remove-Utf8Exact `
    -Path $entry[0] `
    -Old $entry[1] `
    -Marker $entry[2]
}

Write-Host "PASS POST-UX C Iteration 05 HOTFIX 01 eager imports removed" -ForegroundColor Green
