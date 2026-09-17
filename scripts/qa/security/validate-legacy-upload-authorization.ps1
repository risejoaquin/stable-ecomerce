$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSCommandPath)))
Set-Location $root

$failures = 0

function Pass([string]$Message) {
  Write-Host "PASS $Message" -ForegroundColor Green
}

function Fail([string]$Message) {
  $script:failures += 1
  Write-Host "FAIL $Message" -ForegroundColor Red
}

function Assert-True([bool]$Condition, [string]$Message) {
  if ($Condition) { Pass $Message } else { Fail $Message }
}

$server = Get-Content "server.ts" -Raw

$legacyRouteStart = $server.IndexOf("app.post('/api/upload'")
$legacyUploadStart = if ($legacyRouteStart -ge 0) { $server.IndexOf("upload.single('file')", $legacyRouteStart) } else { -1 }
$legacyAuthStart = if ($legacyRouteStart -ge 0) { $server.IndexOf("requireAuth()", $legacyRouteStart) } else { -1 }
$legacyAdminStart = if ($legacyRouteStart -ge 0) { $server.IndexOf("requireAdmin()", $legacyRouteStart) } else { -1 }

Assert-True ($legacyRouteStart -ge 0) "legacy upload route exists"
Assert-True ($legacyAuthStart -gt $legacyRouteStart -and $legacyAuthStart -lt $legacyUploadStart) "legacy upload requires authentication"
Assert-True ($legacyAdminStart -gt $legacyRouteStart -and $legacyAdminStart -lt $legacyUploadStart) "legacy upload requires admin authorization"
Assert-True ($legacyAuthStart -gt $legacyRouteStart -and $legacyAuthStart -lt $legacyAdminStart -and $legacyAdminStart -lt $legacyUploadStart) "admin authorization occurs before multer upload processing"

$modernRouteStart = $server.IndexOf("'/api/upload/product-image'")
$modernUploadStart = if ($modernRouteStart -ge 0) { $server.IndexOf("productImageUpload.single('file')", $modernRouteStart) } else { -1 }
$modernAdminStart = if ($modernRouteStart -ge 0) { $server.IndexOf("requireAdmin()", $modernRouteStart) } else { -1 }

Assert-True ($modernRouteStart -ge 0 -and $modernAdminStart -gt $modernRouteStart -and $modernAdminStart -lt $modernUploadStart) "modern product-image upload remains admin protected"

if ($failures -gt 0) { exit 1 }
exit 0
