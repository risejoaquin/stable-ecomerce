$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$patcher = Join-Path $PSScriptRoot "patch-post-ux-c-hotfix-10.mjs"
if (!(Test-Path $patcher)) {
  throw "Missing patcher: $patcher"
}

node $patcher
if ($LASTEXITCODE -ne 0) {
  throw "HOTFIX 10 patcher failed with exit code $LASTEXITCODE"
}
