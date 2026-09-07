$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$path = "vite.config.ts"

if (!(Test-Path $path)) {
  throw "Missing file: $path"
}

$full = (Resolve-Path $path).Path
$content = [System.IO.File]::ReadAllText(
  $full,
  [System.Text.Encoding]::UTF8
)

$old = "            if (normalizedId.includes('/src/pages/store/')) return 'storefront-pages';"
$new = "            // Storefront route modules intentionally keep their natural Vite/Rollup`r`n            // lazy-route boundaries. Do not collapse them into one shared storefront chunk."

if ($content.Contains($new)) {
  Write-Host "SKIP already applied: storefront route chunk de-grouping" -ForegroundColor Yellow
} elseif ($content.Contains($old)) {
  $content = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH remove forced storefront-pages manual chunk" -ForegroundColor Green
} else {
  throw "Patch anchor not found in vite.config.ts"
}

Write-Host "PASS POST-UX C Iteration 08 patch applied" -ForegroundColor Green
