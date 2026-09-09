Set-StrictMode -Version Latest

function Get-QaRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
}

function Get-QaPowerShellExecutable {
  $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
  if ($pwsh) { return $pwsh.Source }

  $windowsPowerShell = Get-Command powershell.exe -ErrorAction SilentlyContinue
  if ($windowsPowerShell) { return $windowsPowerShell.Source }

  throw "PowerShell executable not found (pwsh/powershell.exe)."
}

function Get-QaNpmExecutable {
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCmd) { return $npmCmd.Source }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) { return $npm.Source }

  throw "npm executable not found."
}

function New-QaRunDirectory {
  param([string]$Suite)

  $root = Get-QaRoot
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $safeSuite = ($Suite -replace '[^A-Za-z0-9._-]', '-')
  $dir = Join-Path $root "artifacts\qa\$stamp-$safeSuite"

  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return $dir
}

function Get-QaCommit {
  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "git.exe"
    $psi.Arguments = "rev-parse --short HEAD"
    $psi.WorkingDirectory = Get-QaRoot
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    $stdout = $p.StandardOutput.ReadToEnd()
    [void]$p.StandardError.ReadToEnd()
    $p.WaitForExit()

    if ($p.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($stdout)) {
      return $stdout.Trim()
    }
  } catch {
  }

  return "unknown"
}

function ConvertTo-QaArgumentString {
  param([string[]]$Arguments = @())

  $quoted = foreach ($arg in $Arguments) {
    if ($null -eq $arg) {
      '""'
    } elseif ($arg -match '[\s"]') {
      '"' + ($arg -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
    } else {
      $arg
    }
  }

  return ($quoted -join ' ')
}

function Invoke-QaExternalStep {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$FilePath,
    [string[]]$Arguments = @(),
    [Parameter(Mandatory=$true)][string]$LogPath
  )

  Write-Host ""
  Write-Host ("=== {0} ===" -f $Name) -ForegroundColor Cyan

  $started = Get-Date
  $exitCode = 999
  $stdout = ""
  $stderr = ""

  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = ConvertTo-QaArgumentString -Arguments $Arguments
    $psi.WorkingDirectory = Get-QaRoot
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    [void]$process.Start()

    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()

    $process.WaitForExit()

    $stdout = $stdoutTask.Result
    $stderr = $stderrTask.Result
    $exitCode = $process.ExitCode
  } catch {
    $stderr = $_.Exception.Message
    $exitCode = 998
  }

  $combined = @()
  if (-not [string]::IsNullOrWhiteSpace($stdout)) {
    $combined += $stdout.TrimEnd()
  }
  if (-not [string]::IsNullOrWhiteSpace($stderr)) {
    $combined += $stderr.TrimEnd()
  }

  $text = ($combined -join [Environment]::NewLine)
  $text | Set-Content -Encoding UTF8 $LogPath

  if (-not [string]::IsNullOrWhiteSpace($text)) {
    Write-Host $text
  }

  $duration = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)

  return [pscustomobject]@{
    name = $Name
    status = $(if ($exitCode -eq 0) { "PASS" } else { "FAIL" })
    exitCode = $exitCode
    durationSeconds = $duration
    log = $LogPath
  }
}

function Write-QaSummary {
  param(
    [Parameter(Mandatory=$true)][string]$Suite,
    [Parameter(Mandatory=$true)][array]$Results,
    [Parameter(Mandatory=$true)][string]$RunDirectory
  )

  $failed = @($Results | Where-Object { $_.status -eq "FAIL" })
  $overall = $(if ($failed.Count -gt 0) { "FAIL" } else { "PASS" })
  $commit = Get-QaCommit
  $timestamp = (Get-Date).ToString("o")

  $md = @()
  $md += ("# Selfcare Sinners QA - {0}" -f $Suite)
  $md += ""
  $md += ("- Timestamp: {0}" -f $timestamp)
  $md += ("- Commit: {0}" -f $commit)
  $md += ("- Result: **{0}**" -f $overall)
  $md += ""
  $md += "| Gate | Status | Seconds | Exit code | Log |"
  $md += "|---|---:|---:|---:|---|"

  foreach ($r in $Results) {
    $logName = [IO.Path]::GetFileName($r.log)
    $md += ("| {0} | {1} | {2} | {3} | {4} |" -f $r.name, $r.status, $r.durationSeconds, $r.exitCode, $logName)
  }

  $md += ""
  $md += ("Final result: **{0}**" -f $overall)

  $summaryMd = Join-Path $RunDirectory "summary.md"
  $summaryJson = Join-Path $RunDirectory "summary.json"

  $md | Set-Content -Encoding UTF8 $summaryMd

  [pscustomobject]@{
    suite = $Suite
    timestamp = $timestamp
    commit = $commit
    result = $overall
    gates = $Results
  } | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $summaryJson

  Write-Host ""
  Write-Host "========================================" -ForegroundColor DarkGray
  Write-Host ("SELFCARE SINNERS - {0}" -f $Suite) -ForegroundColor White

  foreach ($r in $Results) {
    $color = if ($r.status -eq "PASS") { "Green" } else { "Red" }
    Write-Host ("{0,-30} {1}" -f $r.name, $r.status) -ForegroundColor $color
  }

  $finalColor = if ($overall -eq "PASS") { "Green" } else { "Red" }
  Write-Host ("{0,-30} {1}" -f "FINAL RESULT", $overall) -ForegroundColor $finalColor
  Write-Host ("Report: {0}" -f $summaryMd) -ForegroundColor DarkGray
  Write-Host "========================================" -ForegroundColor DarkGray

  if ($overall -eq "FAIL") {
    exit 1
  }

  exit 0
}
