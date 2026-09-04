param(
  [string]$BaseUrl = "",
  [string]$Email = "",
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass($message) { Write-Host "PASS $message" -ForegroundColor Green }
function Fail($message) { Write-Host "FAIL $message" -ForegroundColor Red; exit 1 }
function Assert-File($path, $message) { if (Test-Path $path) { Pass $message } else { Fail "$message ($path)" } }
function Assert-Contains($path, $pattern, $message) {
  if (!(Test-Path $path)) { Fail "$message ($path missing)" }
  $content = Get-Content $path -Raw
  if ($content -match $pattern) { Pass $message } else { Fail "$message ($path missing pattern: $pattern)" }
}

function Assert-ContainsLiteral($path, $text, $message) {
  if (!(Test-Path $path)) { Fail "$message ($path missing)" }
  $content = Get-Content $path -Raw
  if ($content.Contains($text)) { Pass $message } else { Fail "$message ($path missing text: $text)" }
}

Assert-File "src\components\uix\UixPageShell.tsx" "UIX page shell exists"
Assert-File "src\components\uix\UixStatePanel.tsx" "UIX state panel exists"
Assert-File "src\components\uix\UixStatusBadge.tsx" "UIX status badge exists"
Assert-File "src\components\qa\FinalReleaseReadinessPanel.tsx" "final release readiness panel exists"
Assert-File "src\routes\lazy-routes.tsx" "lazy routes module exists"
Assert-File "src\lib\analytics.ts" "central analytics module exists"
Assert-File "src\lib\auth-session.ts" "central auth session module exists"
Assert-File "src\components\account\AccountMenu.tsx" "desktop account menu exists"
Assert-File "src\components\account\AccountMobileSheet.tsx" "mobile account sheet exists"
Assert-File "src\server\email\email-service.ts" "central email service exists"
Assert-File "src\server\email\email-queue.ts" "email queue exists"
Assert-File "src\server\email\email-webhooks.ts" "email webhooks module exists"
Assert-File "src\pages\admin\AdminEmailCenterPage.tsx" "admin email center page exists"
Assert-File "docs\release\QA_RELEASE_E_FINAL_REGRESSION_ACCESSIBILITY_PRODUCTION_CLOSURE.md" "QA release documentation exists"
Assert-File "docs\release\FINAL_PROJECT_STATUS_REPORT.md" "final project status report exists"
Assert-File "docs\release\ACCESSIBILITY_RESPONSIVE_FINAL_CHECKLIST.md" "accessibility responsive checklist exists"

Assert-Contains "src\App.tsx" "Suspense" "App uses React Suspense"
Assert-Contains "vite.config.ts" "manualChunks" "Vite manualChunks configured"

$viteConfig = Get-Content "vite.config.ts" -Raw
if ($viteConfig -match "vendor-react") {
  Fail "Vite config must not generate vendor-react circular chunk"
} else {
  Pass "Vite vendor-react circular chunk removed"
}

# POST-UX B: validate the actual stable-vendor contract instead of depending on
# an old comment string. React, React DOM, React Router and lucide-react must
# remain grouped in vendor to protect the prior production blank-screen regression.
$stableVendorGuards = @(
  "/react/",
  "/react-dom/",
  "/react-router/",
  "/react-router-dom/",
  "/lucide-react/"
)

foreach ($guard in $stableVendorGuards) {
  if ($viteConfig.Contains($guard)) {
    Pass "Vite stable vendor guard exists: $guard"
  } else {
    Fail "Vite stable vendor guard missing: $guard"
  }
}

if ($viteConfig -match "return\s+'vendor'") {
  Pass "Vite stable vendor return protected"
} else {
  Fail "Vite stable vendor return missing"
}

Assert-Contains "src\styles\uix-soft-premium-system.css" "QA RELEASE E" "QA release CSS marker exists"
Assert-Contains "src\components\qa\FinalReleaseReadinessPanel.tsx" "QA / RELEASE E" "final release panel labels phase"
Assert-Contains "src\components\qa\FinalReleaseReadinessPanel.tsx" "Email production" "final release panel covers email production"
Assert-Contains "src\components\qa\FinalReleaseReadinessPanel.tsx" "Performance" "final release panel covers performance"
Assert-Contains "src\server\email\email-service.ts" "dedupe" "Email service keeps dedupe behavior"
Assert-Contains "src\server\email\email-queue.ts" "locked" "Email queue keeps locking behavior"
Assert-Contains "src\lib\analytics.ts" "dedupe_key" "Analytics keeps dedupe key"
Assert-Contains "src\lib\auth-session.ts" "logoutUser" "Central logout remains available"

Assert-File "public\sw.js" "service worker exists"
Assert-Contains "public\sw.js" "selfcare-sinners-static-v4" "service worker static cache version bumped"
Assert-Contains "public\sw.js" "selfcare-sinners-catalog-v2" "service worker catalog cache version bumped"
Assert-Contains "public\sw.js" "offlineHtmlResponse" "service worker defines offline HTML fallback"
Assert-Contains "public\sw.js" "offlineJsonResponse" "service worker defines offline JSON fallback"
Assert-ContainsLiteral "public\sw.js" "cached || caches.match('/') || offlineHtmlResponse()" "service worker never falls back to undefined cached response"
Assert-Contains "public\sw.js" "!url.search" "service worker avoids caching query-param navigations"

if ($BaseUrl.Trim().Length -gt 0) {
  try {
    $homeResponse = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 20
    if ($homeResponse.StatusCode -ge 200 -and $homeResponse.StatusCode -lt 400) {
      Pass "production home responds"
    } else {
      Fail "production home returned $($homeResponse.StatusCode)"
    }
  } catch {
    Fail "production home request failed: $($_.Exception.Message)"
  }
}

Pass "service worker fetch response guard checks"
Pass "qa release e final regression accessibility production closure checks"
