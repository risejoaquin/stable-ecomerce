$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$source = Get-Content '.\vite.config.ts' -Raw

foreach ($needle in @(
  'POST-UX C HOTFIX 18.1: restore the proven stable vendor graph',
  "normalizedId.includes('/react/')",
  "normalizedId.includes('/react-dom/')",
  "normalizedId.includes('/react-router/')",
  "normalizedId.includes('/react-router-dom/')",
  "normalizedId.includes('/lucide-react/')",
  "return 'vendor';"
)) {
  if ($source.Contains($needle)) { Pass "stable vendor restore contract: $needle" } else { Fail "stable vendor restore contract: $needle" }
}

if (-not $source.Contains("if (normalizedId.includes('/lucide-react/')) {`r`n                return undefined;") -and
    -not $source.Contains("if (normalizedId.includes('/lucide-react/')) {`n                return undefined;")) {
  Pass 'HOTFIX 18 lucide natural-boundary override removed'
} else {
  Fail 'HOTFIX 18 lucide natural-boundary override removed'
}

Pass 'POST-UX C HOTFIX 18.1 source rollback checks'
