param(
  [Parameter(Mandatory=$true)][string]$BaseUrl
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd('/')
$checks = @(
  @{ Name = "Health"; Path = "/api/health" },
  @{ Name = "Readiness"; Path = "/api/readiness" },
  @{ Name = "Home"; Path = "/" },
  @{ Name = "FAQ"; Path = "/faq" },
  @{ Name = "Track"; Path = "/track" },
  @{ Name = "Robots"; Path = "/robots.txt" },
  @{ Name = "Sitemap"; Path = "/sitemap.xml" },
  @{ Name = "SEO Products"; Path = "/api/seo/products" },
  @{ Name = "Public Store"; Path = "/api/public/store" },
  @{ Name = "Products"; Path = "/api/products" }
)

foreach ($check in $checks) {
  $uri = "$base$($check.Path)"
  Write-Host "Checking $($check.Name): $uri"
  $response = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing -TimeoutSec 30
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
    throw "$($check.Name) failed with status $($response.StatusCode)"
  }
  Write-Host "PASS $($check.Name) -> $($response.StatusCode)"
}

Write-Host "PASS production smoke checks"
