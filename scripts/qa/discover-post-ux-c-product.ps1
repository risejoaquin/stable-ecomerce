param(
  [string]$BaseUrl = "https://selfcaresinners.com"
)

$ErrorActionPreference = "Stop"
$apiUrl = "$($BaseUrl.TrimEnd('/'))/api/products?page_size=1"

try {
  $response = Invoke-RestMethod -Method Get -Uri $apiUrl -TimeoutSec 30
} catch {
  throw "Could not discover a public product from $apiUrl : $($_.Exception.Message)"
}

$items = @()
if ($response -is [System.Array]) {
  $items = $response
} elseif ($null -ne $response.data) {
  $items = @($response.data)
} elseif ($null -ne $response.products) {
  $items = @($response.products)
}

if ($items.Count -lt 1) {
  throw "No public product returned by $apiUrl"
}

$product = $items[0]
if ([string]::IsNullOrWhiteSpace([string]$product.id)) {
  throw "First public product does not contain an id"
}

$path = "/product/$($product.id)"
if ($product.slug) {
  $path = "/product/$($product.id)/$($product.slug)"
}

Write-Host "PRODUCT_PATH=$path" -ForegroundColor Green
Write-Output $path
