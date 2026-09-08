$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$source = Get-Content '.\vite.config.ts' -Raw

foreach ($needle in @(
  "normalizedId.includes('/react-hot-toast/')",
  "normalizedId.includes('/goober/')",
  "return 'vendor-toast';",
  "normalizedId.includes('/react/')",
  "normalizedId.includes('/react-dom/')",
  "normalizedId.includes('/react-router/')",
  "normalizedId.includes('/react-router-dom/')",
  "normalizedId.includes('/lucide-react/')"
)) {
  if ($source.Contains($needle)) { Pass "Vite HOTFIX 19.2 contract: $needle" } else { Fail "Vite HOTFIX 19.2 contract: $needle" }
}

$toastIndex = $source.IndexOf("return 'vendor-toast';")
$uiIndex = $source.IndexOf("return 'vendor-ui';")
if ($toastIndex -ge 0 -and $uiIndex -ge 0 -and $toastIndex -lt $uiIndex) {
  Pass 'vendor-toast rule executes before vendor-ui rule'
} else {
  Fail 'vendor-toast rule executes before vendor-ui rule'
}

Pass 'POST-UX C HOTFIX 19.2 source checks'
