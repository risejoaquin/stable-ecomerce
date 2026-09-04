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

$changes = @(
  @{
    Old = "            if (normalizedId.includes('/src/pages/admin/')) return 'admin-pages';"
    New = "            // Admin route modules keep their natural lazy-route boundaries."
    Marker = "remove forced admin-pages manual chunk"
  },
  @{
    Old = "            if (normalizedId.includes('/src/server/email/') || normalizedId.includes('/src/hooks/useAdminEmail')) return 'email-admin';"
    New = "            // Admin email modules keep natural Rollup dependency boundaries."
    Marker = "remove forced email-admin manual chunk"
  }
)

foreach ($change in $changes) {
  if ($content.Contains($change.New)) {
    Write-Host "SKIP already applied: $($change.Marker)" -ForegroundColor Yellow
    continue
  }

  if (!$content.Contains($change.Old)) {
    throw "Patch anchor not found: $($change.Marker)"
  }

  $content = $content.Replace($change.Old, $change.New)
  Write-Host "PATCH $($change.Marker)" -ForegroundColor Green
}

[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)
Write-Host "PASS POST-UX C Iteration 09 patch applied" -ForegroundColor Green
