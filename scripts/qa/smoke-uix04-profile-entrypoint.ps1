$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "src/components/editorial/EditorialHeader.tsx",
  "src/components/editorial/MobileEditorialNav.tsx",
  "src/styles/soft-beauty-theme.css",
  "src/pages/store/ProfilePage.tsx"
)

foreach ($file in $requiredFiles) {
  if (!(Test-Path $file)) {
    throw "Missing required file: $file"
  }
  Write-Host "PASS file exists: $file"
}

$header = Get-Content "src/components/editorial/EditorialHeader.tsx" -Raw
$mobile = Get-Content "src/components/editorial/MobileEditorialNav.tsx" -Raw
$css = Get-Content "src/styles/soft-beauty-theme.css" -Raw

if ($header -notmatch 'to="/profile"') { throw "Header does not link to /profile" }
if ($header -notmatch 'Cuenta') { throw "Header does not show Cuenta label" }
if ($header -notmatch 'UserRound') { throw "Header does not include visible account icon" }
if ($mobile -notmatch 'to="/profile"') { throw "Mobile nav does not link to /profile" }
if ($mobile -notmatch 'Cuenta') { throw "Mobile nav does not show Cuenta label" }
if ($css -notmatch 'UIX04.1') { throw "UIX04.1 CSS hotfix marker missing" }

Write-Host "PASS UIX04.1 profile account entrypoint checks"
