$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\qa-common.ps1")

$root = Get-QaRoot
Set-Location $root

$npm = Get-QaNpmExecutable
$ps = Get-QaPowerShellExecutable
$run = New-QaRunDirectory -Suite "release"
$results = @()

$results += Invoke-QaExternalStep -Name "TypeScript" -FilePath $npm -Arguments @("run", "lint") -LogPath (Join-Path $run "typescript.log")
$results += Invoke-QaExternalStep -Name "Unit tests" -FilePath $npm -Arguments @("test") -LogPath (Join-Path $run "tests.log")
$results += Invoke-QaExternalStep -Name "Build" -FilePath $npm -Arguments @("run", "build") -LogPath (Join-Path $run "build.log")
$results += Invoke-QaExternalStep -Name "Secret scan" -FilePath $ps -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "scripts\qa\security\scan-local-secrets.ps1")) -LogPath (Join-Path $run "secret-scan.log")
$results += Invoke-QaExternalStep -Name "Resend webhook security" -FilePath $ps -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "scripts\qa\security\validate-resend-webhook-signature.ps1")) -LogPath (Join-Path $run "resend-webhook-security.log")
$results += Invoke-QaExternalStep -Name "Security baseline report" -FilePath $ps -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "scripts\qa\security\validate-security-baseline.ps1"), "-Mode", "Report") -LogPath (Join-Path $run "security-baseline.log")
$results += Invoke-QaExternalStep -Name "Core regression" -FilePath $ps -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root "scripts\qa\regression\validate-regression-core.ps1")) -LogPath (Join-Path $run "regression-core.log")

Write-QaSummary -Suite "RELEASE GATE" -Results $results -RunDirectory $run
