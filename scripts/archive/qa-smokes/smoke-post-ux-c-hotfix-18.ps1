$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$source = Get-Content '.\vite.config.ts' -Raw

foreach ($needle in @(
  'POST-UX C HOTFIX 18: keep the proven React/React DOM/Router core',
  "normalizedId.includes('/lucide-react/')",
  'return undefined;',
  "normalizedId.includes('/react/')",
  "normalizedId.includes('/react-dom/')",
  "normalizedId.includes('/react-router/')",
  "normalizedId.includes('/react-router-dom/')",
  "return 'vendor';"
)) {
  if ($source.Contains($needle)) { Pass "Vite contract: $needle" } else { Fail "Vite contract: $needle" }
}

$lucideIndex = $source.IndexOf("normalizedId.includes('/lucide-react/')")
$reactIndex = $source.IndexOf("normalizedId.includes('/react/')")
if ($lucideIndex -ge 0 -and $reactIndex -ge 0 -and $lucideIndex -lt $reactIndex) {
  Pass 'lucide natural-boundary rule executes before stable React vendor rule'
} else {
  Fail 'lucide natural-boundary rule executes before stable React vendor rule'
}

if ($source.Contains("if (normalizedId.includes('/lucide-react/')) {") -and
    $source.Contains("return undefined;")) {
  Pass 'lucide is not forced into a monolithic manual vendor chunk'
} else {
  Fail 'lucide is not forced into a monolithic manual vendor chunk'
}

Pass 'POST-UX C HOTFIX 18 source contract checks'
