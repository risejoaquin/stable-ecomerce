$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "..\lib\qa-common.ps1")
$root = Get-QaRoot
Set-Location $root
$ps = Get-QaPowerShellExecutable
$run = New-QaRunDirectory -Suite "regression-core"
$scripts = @(
  "scripts\qa\smoke-qa-release-e.ps1",
  "scripts\qa\smoke-mobile-ux-f.ps1",
  "scripts\qa\smoke-post-ux-c-hotfix-20.ps1",
  "scripts\qa\smoke-post-ux-c-hotfix-20-2.ps1"
)
$results = @()
foreach ($script in $scripts) {
  if (!(Test-Path $script)) {
    $results += [pscustomobject]@{ name = $script; status = "FAIL"; exitCode = 2; durationSeconds = 0; log = "missing" }
    continue
  }
  $name = [IO.Path]::GetFileNameWithoutExtension($script)
  $results += Invoke-QaExternalStep -Name $name -FilePath $ps -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $root $script)) -LogPath (Join-Path $run "$name.log")
}
Write-QaSummary -Suite "CORE REGRESSION" -Results $results -RunDirectory $run
