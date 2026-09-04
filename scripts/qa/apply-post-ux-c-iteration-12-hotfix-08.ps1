$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "src\pages\store\ProductDetailPage.tsx"
if (!(Test-Path $path)) { throw "Missing $path" }

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

$old = @'
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const { data: ratingData } = useProductRating(secondaryContentReady ? (id || '') : '');
  const { isSignedIn } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [secondaryContentReady, setSecondaryContentReady] = useState(false);
'@

$new = @'
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const [secondaryContentReady, setSecondaryContentReady] = useState(false);
  const { data: ratingData } = useProductRating(secondaryContentReady ? (id || '') : '');
  const { isSignedIn } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
'@

if ($content.Contains($new)) {
  Write-Host "SKIP secondaryContentReady declaration order already fixed" -ForegroundColor Yellow
} elseif ($content.Contains($old)) {
  $content = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH moved secondaryContentReady state before first usage" -ForegroundColor Green
} else {
  throw "Expected declaration-order anchor not found in ProductDetailPage.tsx"
}

Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 08 applied" -ForegroundColor Green
