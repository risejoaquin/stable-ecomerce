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

$deps = @(
  "aria-hidden",
  "react-remove-scroll",
  "react-remove-scroll-bar",
  "react-style-singleton",
  "use-callback-ref",
  "use-sidecar"
)

$already = $true
foreach ($dep in $deps) {
  if (-not $content.Contains("/$dep/")) {
    $already = $false
    break
  }
}

if ($already -and $content.Contains("return 'vendor-ui'")) {
  Write-Host "SKIP POST-UX C Iteration 12 already applied" -ForegroundColor Yellow
  Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 02 applied" -ForegroundColor Green
  exit 0
}

$clauses = @"
                normalizedId.includes('/aria-hidden/') ||
                normalizedId.includes('/react-remove-scroll/') ||
                normalizedId.includes('/react-remove-scroll-bar/') ||
                normalizedId.includes('/react-style-singleton/') ||
                normalizedId.includes('/use-callback-ref/') ||
                normalizedId.includes('/use-sidecar/')
"@

$patched = $false

# Strategy A: extend an existing react-hot-toast vendor-ui condition.
if (-not $patched -and $content.Contains("normalizedId.includes('/react-hot-toast/')")) {
  $needle = "normalizedId.includes('/react-hot-toast/')"
  $replacement = @"
normalizedId.includes('/react-hot-toast/') ||
$clauses
"@
  $content = $content.Replace($needle, $replacement.TrimEnd())
  $patched = $true
  Write-Host "PATCH strategy A - extended existing react-hot-toast vendor-ui condition" -ForegroundColor Green
}

# Strategy B: extend an existing @radix-ui condition if react-hot-toast is absent.
if (-not $patched -and $content.Contains("normalizedId.includes('/@radix-ui/')")) {
  $needle = "normalizedId.includes('/@radix-ui/')"
  $replacement = @"
normalizedId.includes('/@radix-ui/') ||
$clauses
"@
  $content = $content.Replace($needle, $replacement.TrimEnd())
  $patched = $true
  Write-Host "PATCH strategy B - extended existing @radix-ui condition" -ForegroundColor Green
}

# Strategy C: if vendor-ui does not exist locally, create it before the default node_modules vendor return.
if (-not $patched) {
  $defaultNeedle = "              return 'vendor';"
  if ($content.Contains($defaultNeedle)) {
    $vendorUiBlock = @"
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

              return 'vendor';
"@
    $content = $content.Replace($defaultNeedle, $vendorUiBlock.TrimEnd())
    $patched = $true
    Write-Host "PATCH strategy C - created vendor-ui block before default vendor return" -ForegroundColor Green
  }
}

if (-not $patched) {
  Write-Host "Relevant manualChunks lines:" -ForegroundColor Yellow
  $lines = $content -split "`r?`n"
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'manualChunks|node_modules|return .vendor|normalizedId\.includes') {
      Write-Host ("{0}: {1}" -f ($i + 1), $lines[$i])
    }
  }
  throw "No safe insertion point found in vite.config.ts"
}

[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 02 applied" -ForegroundColor Green
