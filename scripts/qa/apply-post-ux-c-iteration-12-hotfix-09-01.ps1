$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "src\routes\lazy-routes.tsx"
if (!(Test-Path $path)) { throw "Missing $path" }

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

$targetCrLf = "export const LazyProductDetailPage = lazyNamed(() => import('../pages/store/ProductDetailPage'), 'ProductDetailPage');`r`n"
$targetLf = "export const LazyProductDetailPage = lazyNamed(() => import('../pages/store/ProductDetailPage'), 'ProductDetailPage');`n"
$targetNoNl = "export const LazyProductDetailPage = lazyNamed(() => import('../pages/store/ProductDetailPage'), 'ProductDetailPage');"

if ($content.Contains($targetCrLf)) {
  $content = $content.Replace($targetCrLf, "")
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH removed LazyProductDetailPage export (CRLF)" -ForegroundColor Green
} elseif ($content.Contains($targetLf)) {
  $content = $content.Replace($targetLf, "")
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH removed LazyProductDetailPage export (LF)" -ForegroundColor Green
} elseif ($content.Contains($targetNoNl)) {
  $content = $content.Replace($targetNoNl, "")
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH removed LazyProductDetailPage export" -ForegroundColor Green
} elseif (!$content.Contains("LazyProductDetailPage") -and !$content.Contains("pages/store/ProductDetailPage")) {
  Write-Host "SKIP already removed: LazyProductDetailPage export" -ForegroundColor Yellow
} else {
  throw "Unable to safely remove LazyProductDetailPage export"
}

Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 09.1 applied" -ForegroundColor Green
