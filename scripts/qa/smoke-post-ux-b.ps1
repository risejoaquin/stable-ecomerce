$ErrorActionPreference = 'Stop'

function Assert-Contains([string]$Path, [string]$Needle, [string]$Label) {
  if (-not (Test-Path $Path)) { throw "FAIL $Label - missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notlike "*$Needle*") { throw "FAIL $Label - missing text: $Needle" }
  Write-Host "PASS $Label"
}

Assert-Contains '.\vite.config.ts' 'selfcare-stable-compression' 'stable compression plugin exists'
Assert-Contains '.\vite.config.ts' 'node:zlib' 'built-in zlib compression exists'
Assert-Contains '.\vite.config.ts' 'vendor-observability' 'observability vendor split exists'
Assert-Contains '.\vite.config.ts' 'vendor-ui' 'UI vendor split exists'
Assert-Contains '.\vite.config.ts' "normalizedId.includes('/react-router/')" 'React Router stable vendor guard exists'
Assert-Contains '.\vite.config.ts' "normalizedId.includes('/lucide-react/')" 'lucide stable vendor guard exists'
Assert-Contains '.\vite.config.ts' "normalizedId.includes('/d3-')" 'chart dependency split exists'
Assert-Contains '.\docs\performance\POST_UX_B_BUNDLE_BUILD_OPTIMIZATION.md' 'POST-UX B' 'POST UX B report exists'

if (Select-String -Path '.\vite.config.ts' -Pattern "import viteCompression" -Quiet) {
  throw 'FAIL legacy vite-plugin-compression import still active'
}
Write-Host 'PASS legacy vite-plugin-compression runtime removed'

if (Test-Path '.\dist\C:') {
  throw 'FAIL Windows absolute-path compression artifact exists under dist/C:'
}
Write-Host 'PASS no dist/C: artifact currently present'

Write-Host 'PASS POST-UX B - bundle and build optimization source checks'
