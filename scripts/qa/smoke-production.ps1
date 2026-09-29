param(
  [Parameter(Mandatory=$true)][string]$BaseUrl
)

$ErrorActionPreference = "Stop"
& "$PSScriptRoot/validate-production.ps1" -BaseUrl $BaseUrl
