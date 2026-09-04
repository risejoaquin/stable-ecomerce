$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "vite.config.ts"
if (!(Test-Path $path)) {
  throw "Missing vite.config.ts"
}

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

$required = @(
  "/aria-hidden/",
  "/react-remove-scroll/",
  "/react-remove-scroll-bar/",
  "/react-style-singleton/",
  "/use-callback-ref/",
  "/use-sidecar/"
)

$alreadyApplied = $true
foreach ($needle in $required) {
  if (-not $content.Contains($needle)) {
    $alreadyApplied = $false
    break
  }
}

if ($alreadyApplied) {
  Write-Host "SKIP POST-UX C Iteration 12 already applied" -ForegroundColor Yellow
  Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 01 applied" -ForegroundColor Green
  exit 0
}

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

if (-not $content.Contains($old)) {
  Write-Host "Current vendor-ui related lines:" -ForegroundColor Yellow
  $lines = $content -split "`r?`n"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'vendor-ui|radix-ui|react-hot-toast|motion') {
      Write-Host ("{0}: {1}" -f ($i + 1), $lines[$i])
    }
  }
  throw "Exact current vendor-ui anchor not found in vite.config.ts"
}

$content = $content.Replace($old, $new)
[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

Write-Host "PATCH Radix UI transitive dependencies isolated into vendor-ui" -ForegroundColor Green
Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 01 applied" -ForegroundColor Green
