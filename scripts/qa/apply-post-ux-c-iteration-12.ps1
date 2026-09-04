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
                normalizedId.includes('/motion/') ||
                normalizedId.includes('/@radix-ui/') ||
                normalizedId.includes('/react-hot-toast/')
              ) return 'vendor-ui';
'@

$new = @'
              if (
                normalizedId.includes('/motion/') ||
                normalizedId.includes('/@radix-ui/') ||
                normalizedId.includes('/react-hot-toast/') ||
                normalizedId.includes('/aria-hidden/') ||
                normalizedId.includes('/react-remove-scroll/') ||
                normalizedId.includes('/react-remove-scroll-bar/') ||
                normalizedId.includes('/react-style-singleton/') ||
                normalizedId.includes('/use-callback-ref/') ||
                normalizedId.includes('/use-sidecar/')
              ) return 'vendor-ui';
'@

if ($content.Contains($new)) {
  Write-Host "SKIP already applied: Radix UI transitive dependencies grouped with vendor-ui" -ForegroundColor Yellow
} elseif ($content.Contains($old)) {
  $content = $content.Replace($old, $new)
  [System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
  Write-Host "PATCH extend vendor-ui with confirmed Radix dialog dependency graph" -ForegroundColor Green
} else {
  throw "Patch anchor not found in vite.config.ts"
}

Write-Host "PASS POST-UX C Iteration 12 patch applied" -ForegroundColor Green
