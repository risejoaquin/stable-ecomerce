$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\qa-common.ps1")

$root = Get-QaRoot
Set-Location $root

$npm = Get-QaNpmExecutable
$run = New-QaRunDirectory -Suite "fast"
$results = @()

$results += Invoke-QaExternalStep -Name "TypeScript" -FilePath $npm -Arguments @("run", "lint") -LogPath (Join-Path $run "typescript.log")
$results += Invoke-QaExternalStep -Name "Unit tests" -FilePath $npm -Arguments @("test") -LogPath (Join-Path $run "tests.log")
$results += Invoke-QaExternalStep -Name "Build" -FilePath $npm -Arguments @("run", "build") -LogPath (Join-Path $run "build.log")

Write-QaSummary -Suite "FAST GATE" -Results $results -RunDirectory $run
