$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "src/components/editorial/EditorialHeader.tsx",
  "src/components/editorial/MobileEditorialNav.tsx",
  "src/styles/soft-beauty-theme.css",
  "docs/uix/URGENT_FLOW_01_LOGOUT_ACCOUNT_NAVIGATION.md"
)

foreach ($file in $requiredFiles) {
  if (!(Test-Path $file)) { throw "Missing required file: $file" }
}

$header = Get-Content "src/components/editorial/EditorialHeader.tsx" -Raw
$mobile = Get-Content "src/components/editorial/MobileEditorialNav.tsx" -Raw
$css = Get-Content "src/styles/soft-beauty-theme.css" -Raw

$checks = @(
  @{ Name = "desktop account dropdown component"; Pass = $header -match "AccountDropdown" },
  @{ Name = "desktop logout button"; Pass = $header -match "Cerrar sesión" -and $header -match "closeSession" },
  @{ Name = "desktop clears auth token"; Pass = $header -match "localStorage\.removeItem\('auth_token'\)" },
  @{ Name = "desktop admin conditional"; Pass = $header -match "role === 'admin'" -and $header -match "Panel administrador" },
  @{ Name = "desktop escape close"; Pass = $header -match "event\.key === 'Escape'" },
  @{ Name = "mobile account sheet"; Pass = $mobile -match "ss-mobile-account-sheet" -and $mobile -match "role=\"dialog\"" },
  @{ Name = "mobile logout button"; Pass = $mobile -match "Cerrar sesión" -and $mobile -match "closeSession" },
  @{ Name = "mobile admin conditional"; Pass = $mobile -match "role === 'admin'" -and $mobile -match "Panel administrador" },
  @{ Name = "account CSS added"; Pass = $css -match "ss-account-dropdown" -and $css -match "ss-mobile-account-overlay" },
  @{ Name = "logout CSS visible"; Pass = $css -match "ss-account-logout" -and $css -match "ss-mobile-account-logout" }
)

foreach ($check in $checks) {
  if (-not $check.Pass) { throw "FAIL $($check.Name)" }
  Write-Host "PASS $($check.Name)"
}

Write-Host "PASS urgent logout account navigation checks"
