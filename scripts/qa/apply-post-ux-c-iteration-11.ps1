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

$old = @'
              if (
                normalizedId.includes('/recharts/') ||
                normalizedId.includes('/d3-') ||
                normalizedId.includes('/victory-vendor/')
              ) return 'vendor-charts';
'@

$new = @'
              if (
                normalizedId.includes('/recharts/') ||
                normalizedId.includes('/d3-') ||
                normalizedId.includes('/victory-vendor/') ||
                normalizedId.includes('/@reduxjs/toolkit/') ||
                normalizedId.includes('/decimal.js-light/') ||
                normalizedId.includes('/es-toolkit/') ||
                normalizedId.includes('/eventemitter3/') ||
                normalizedId.includes('/immer/') ||
                normalizedId.includes('/react-redux/') ||
                normalizedId.includes('/redux/') ||
                normalizedId.includes('/redux-thunk/') ||
                normalizedId.includes('/reselect/') ||
                normalizedId.includes('/use-sync-external-store/')
              ) return 'vendor-charts';
'@

if ($content.Contains($new)) {
  Write-Host "SKIP already applied: recharts transitive dependencies grouped with vendor-charts" -ForegroundColor Yellow
} elseif ($content.Contains($old)) {
  $content = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH extend vendor-charts with confirmed Recharts dependency graph" -ForegroundColor Green
} else {
  throw "Patch anchor not found in vite.config.ts"
}

Write-Host "PASS POST-UX C Iteration 11 patch applied" -ForegroundColor Green
