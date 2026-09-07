$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$path = "src\pages\store\ProductDetailPage.tsx"
if (!(Test-Path $path)) { throw "Missing $path" }

$full = (Resolve-Path $path).Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)

$imports = @(
  "import { ReviewList } from '../../components/reviews/ReviewList';",
  "import { ReviewForm } from '../../components/reviews/ReviewForm';"
)

foreach ($import in $imports) {
  if ($content.Contains($import)) {
    $content = $content.Replace($import + "`r`n", "")
    $content = $content.Replace($import + "`n", "")
    $content = $content.Replace($import, "")
    Write-Host "PATCH removed eager import: $import" -ForegroundColor Green
  } else {
    Write-Host "SKIP eager import already absent: $import" -ForegroundColor Yellow
  }
}

[System.IO.File]::WriteAllText($full, $content, $utf8NoBom)

Write-Host "PASS POST-UX C ITERATION 12 HOTFIX 07 applied" -ForegroundColor Green
