$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location $root

# Scan only files tracked by Git. This avoids node_modules/build artifacts and
# still catches secrets that could actually be committed/pushed.
$trackedFiles = @(& git ls-files)
if ($LASTEXITCODE -ne 0) {
  Write-Host "FAIL unable to enumerate Git-tracked files" -ForegroundColor Red
  exit 1
}

$patterns = @(
  @{
    Name = "Stripe live secret"
    Regex = '(?<![A-Za-z0-9_])sk_live_[A-Za-z0-9]{16,}(?![A-Za-z0-9_])'
  },
  @{
    Name = "Stripe restricted live secret"
    Regex = '(?<![A-Za-z0-9_])rk_live_[A-Za-z0-9]{16,}(?![A-Za-z0-9_])'
  },
  @{
    Name = "Stripe webhook secret"
    Regex = '(?<![A-Za-z0-9_])whsec_[A-Za-z0-9]{16,}(?![A-Za-z0-9_])'
  },
  @{
    # Important: require a token boundary before "re_". The previous scanner
    # matched the "re_" substring inside identifiers such as store_id.
    Name = "Resend API key"
    Regex = '(?<![A-Za-z0-9_])re_[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-])'
  },
  @{
    Name = "GitHub classic token"
    Regex = '(?<![A-Za-z0-9_])ghp_[A-Za-z0-9]{30,}(?![A-Za-z0-9_])'
  },
  @{
    Name = "GitHub fine-grained token"
    Regex = '(?<![A-Za-z0-9_])github_pat_[A-Za-z0-9_]{40,}(?![A-Za-z0-9_])'
  },
  @{
    Name = "Private key block"
    Regex = '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  }
)

$hits = @()

foreach ($relativePath in $trackedFiles) {
  if ([string]::IsNullOrWhiteSpace($relativePath)) { continue }

  $fullPath = Join-Path $root $relativePath
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { continue }

  # Skip known binary/media files. Text/source/config/docs remain in scope.
  $extension = [IO.Path]::GetExtension($relativePath).ToLowerInvariant()
  if ($extension -in @(
    '.png','.jpg','.jpeg','.gif','.webp','.avif','.ico','.pdf','.zip','.gz',
    '.woff','.woff2','.ttf','.eot','.mp4','.mov','.avi','.mp3','.wav'
  )) {
    continue
  }

  try {
    $text = Get-Content -LiteralPath $fullPath -Raw -ErrorAction Stop
  } catch {
    continue
  }

  # Windows PowerShell 5.1 returns $null for empty files when using Get-Content -Raw.
  if ($null -eq $text) {
    $text = ""
  }

  foreach ($pattern in $patterns) {
    if ([regex]::IsMatch([string]$text, [string]$pattern.Regex)) {
      $hits += [pscustomobject]@{
        file = $relativePath
        type = $pattern.Name
      }
    }
  }
}

if ($hits.Count -gt 0) {
  Write-Host "FAIL possible committed secrets detected" -ForegroundColor Red
  $hits | Sort-Object file,type -Unique | Format-Table -AutoSize
  Write-Host ""
  Write-Host "Values are intentionally not printed." -ForegroundColor Yellow
  exit 1
}

Write-Host "PASS no obvious committed live secrets detected" -ForegroundColor Green
exit 0
