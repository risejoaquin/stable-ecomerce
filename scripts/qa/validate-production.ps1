param(
  [string]$BaseUrl = "https://selfcaresinners.com",
  [string]$ExpectedCommit = ""
)
$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$routes = @('/', '/faq', '/privacy', '/returns', '/terms', '/track')
foreach ($route in $routes) {
  try {
    $r = Invoke-WebRequest -Uri ($base + $route) -UseBasicParsing -TimeoutSec 25
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { Pass "route $route -> $($r.StatusCode)" }
    else { Fail "route $route -> $($r.StatusCode)" }
  } catch { Fail "route $route request failed: $($_.Exception.Message)" }
}

$serviceEndpoints = @(
  @{ Name = "readiness"; Path = "/api/readiness" },
  @{ Name = "robots.txt"; Path = "/robots.txt" },
  @{ Name = "sitemap.xml"; Path = "/sitemap.xml" },
  @{ Name = "seo products"; Path = "/api/seo/products" },
  @{ Name = "public store"; Path = "/api/public/store" },
  @{ Name = "products catalog"; Path = "/api/products" }
)
foreach ($ep in $serviceEndpoints) {
  try {
    $r = Invoke-WebRequest -Uri ($base + $ep.Path) -UseBasicParsing -TimeoutSec 25
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { Pass "$($ep.Name) $($ep.Path) -> $($r.StatusCode)" }
    else { Fail "$($ep.Name) $($ep.Path) -> $($r.StatusCode)" }
  } catch { Fail "$($ep.Name) $($ep.Path) request failed: $($_.Exception.Message)" }
}

try {
  $healthResponse = Invoke-RestMethod -Uri "$base/api/health" -TimeoutSec 20
  if ($healthResponse.status -ne 'ok') { Fail "health status is '$($healthResponse.status)'" }
  Pass "health status -> ok"

  if (-not [string]::IsNullOrWhiteSpace($ExpectedCommit)) {
    if ($healthResponse.version -ne $ExpectedCommit) {
      Fail "deployed commit mismatch: expected $ExpectedCommit, received $($healthResponse.version)"
    }
    Pass "deployed commit -> $ExpectedCommit"
  }
} catch {
  Fail "health validation failed: $($_.Exception.Message)"
}

try {
  $unauth = Invoke-WebRequest -Uri "$base/api/admin/diagnostics" -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
  Fail "admin diagnostics unexpectedly allowed unauthenticated request ($($unauth.StatusCode))"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  if ($status -eq 401 -or $status -eq 403) { Pass "admin diagnostics unauthorized boundary -> $status" }
  else { Fail "admin diagnostics unexpected unauthenticated result: $($_.Exception.Message)" }
}

try {
  $homeResponse = Invoke-WebRequest -Uri $base -UseBasicParsing -TimeoutSec 25
  $headers = $homeResponse.Headers
  if ($headers['Content-Security-Policy']) { Pass "Content-Security-Policy present" } else { Fail "Content-Security-Policy missing" }
  if ($headers['X-Content-Type-Options']) { Pass "X-Content-Type-Options present" } else { Fail "X-Content-Type-Options missing" }
} catch { Fail "header validation failed: $($_.Exception.Message)" }

Pass "production non-destructive smoke"
