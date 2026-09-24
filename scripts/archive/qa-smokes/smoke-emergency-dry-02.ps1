$ErrorActionPreference = "Stop"

function Assert-Contains($Path, $Pattern, $Message) {
  if (-not (Test-Path $Path)) { throw "Missing file: $Path" }
  $match = Select-String -Path $Path -Pattern $Pattern -SimpleMatch -ErrorAction SilentlyContinue
  if (-not $match) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

function Assert-NotContains($Path, $Pattern, $Message) {
  if (-not (Test-Path $Path)) { throw "Missing file: $Path" }
  $match = Select-String -Path $Path -Pattern $Pattern -SimpleMatch -ErrorAction SilentlyContinue
  if ($match) { throw "FAIL $Message" }
  Write-Host "PASS $Message"
}

function Count-Matches($Path, $Pattern) {
  if (-not (Test-Path $Path)) { return 0 }
  $matches = Select-String -Path $Path -Pattern $Pattern -SimpleMatch -ErrorAction SilentlyContinue
  if (-not $matches) { return 0 }
  return @($matches).Count
}

Assert-Contains "src/lib/analytics.ts" "export function trackMarketingEvent" "central trackMarketingEvent exists"
Assert-Contains "src/lib/analytics.ts" "export function trackPageView" "central trackPageView exists"
Assert-Contains "src/lib/analytics.ts" "event_id" "analytics payload sends event_id"
Assert-Contains "src/lib/analytics.ts" "dedupe_key" "analytics payload sends dedupe_key"
Assert-Contains "src/lib/analytics.ts" "sessionStorage" "frontend dedupe uses sessionStorage"
Assert-Contains "src/lib/analytics.ts" "PAGE_VIEW_DEDUPE_TTL_MS" "page view dedupe configured"
Assert-Contains "src/lib/analytics.ts" "fetch('/api/analytics/events'" "analytics event fetch centralized"

$trackedFiles = @(
  "src/App.tsx",
  "src/pages/store/HomePage.tsx",
  "src/pages/store/ProductDetailPage.tsx",
  "src/components/editorial/EditorialProductCard.tsx"
)

foreach ($file in $trackedFiles) {
  Assert-Contains $file "trackMarketingEvent" "$file uses centralized analytics import/call"
  Assert-NotContains $file "function trackMarketingEvent" "$file no longer defines duplicated trackMarketingEvent"
  Assert-NotContains $file "fetch('/api/analytics/events'" "$file no longer posts analytics directly"
}

$directFetchCount = Count-Matches "src/lib/analytics.ts" "fetch('/api/analytics/events'"
if ($directFetchCount -ne 1) { throw "FAIL expected exactly one direct analytics fetch, found $directFetchCount" }
Write-Host "PASS exactly one direct analytics fetch"

Write-Host "PASS emergency dry 02 analytics dedupe checks"
