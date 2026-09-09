$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\qa-common.ps1")
$root = Get-QaRoot
Set-Location $root
$ps = Get-QaPowerShellExecutable
$run = New-QaRunDirectory -Suite "all"
$results = @()

$results += Invoke-QaExternalStep -Name "Release gate" -FilePath $ps -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "scripts\qa\validate-release.ps1")) -LogPath (Join-Path $run "release.log")
$results += Invoke-QaExternalStep -Name "Dependency report" -FilePath $ps -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "scripts\qa\quality\validate-dependencies.ps1")) -LogPath (Join-Path $run "dependencies.log")

Write-QaSummary -Suite "ALL LOCAL QA" -Results $results -RunDirectory $run
