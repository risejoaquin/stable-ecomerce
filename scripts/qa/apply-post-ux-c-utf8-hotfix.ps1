$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

# IMPORTANT:
# Keep this script ASCII-only. Do not embed mojibake or accented literals here.
# Windows PowerShell may reinterpret source encoding before parsing the script.

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$cp1252 = [System.Text.Encoding]::GetEncoding(
  1252,
  [System.Text.EncoderReplacementFallback]::new("?"),
  [System.Text.DecoderReplacementFallback]::new("?")
)

function Get-MojibakeScore {
  param([string]$Text)

  if ($null -eq $Text) { return 0 }

  $score = 0
  foreach ($codePoint in @(0x00C3, 0x00C2, 0x00E2)) {
    $ch = [string][char]$codePoint
    $score += ([regex]::Matches($Text, [regex]::Escape($ch))).Count
  }

  return $score
}

function Try-RepairMojibake {
  param([string]$Text)

  $current = $Text

  for ($pass = 0; $pass -lt 3; $pass++) {
    $beforeScore = Get-MojibakeScore $current
    if ($beforeScore -eq 0) { break }

    try {
      $bytes = $cp1252.GetBytes($current)
      $candidate = [System.Text.Encoding]::UTF8.GetString($bytes)
    } catch {
      break
    }

    $afterScore = Get-MojibakeScore $candidate

    if ($afterScore -lt $beforeScore) {
      $current = $candidate
      continue
    }

    break
  }

  return $current
}

$targets = @(
  "src\pages\store\HomePage.tsx",
  "src\pages\store\ProductDetailPage.tsx"
)

foreach ($path in $targets) {
  if (!(Test-Path $path)) {
    throw "Missing target: $path"
  }

  $full = (Resolve-Path $path).Path
  $text = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)
  $originalScore = Get-MojibakeScore $text

  if ($originalScore -eq 0) {
    Write-Host "SKIP UTF-8 already clean: $path" -ForegroundColor Yellow
    continue
  }

  $repaired = Try-RepairMojibake $text
  $finalScore = Get-MojibakeScore $repaired

  if ($finalScore -ge $originalScore) {
    throw "UTF-8 repair did not reduce mojibake score for $path (before=$originalScore after=$finalScore)"
  }

  [System.IO.File]::WriteAllText($full, $repaired, $utf8NoBom)

  Write-Host "PATCH repaired UTF-8 copy: $path (score $originalScore -> $finalScore)" -ForegroundColor Green
}

Write-Host "PASS POST-UX C UTF-8 storefront repair applied" -ForegroundColor Green
