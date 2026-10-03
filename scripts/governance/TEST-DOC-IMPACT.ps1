param(
    [Parameter(Mandatory=$true)][string]$RepoPath,
    [string]$BaseRef = '',
    [string]$HeadRef = 'HEAD',
    [ValidateSet('WorkingTree','Committed')][string]$Mode = 'Committed',
    [string]$EventName = 'pull_request',
    [string]$Justification = ''
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path -LiteralPath $RepoPath -PathType Container)) {
    Write-Host "DOC_ERROR: Target repository path '$RepoPath' does not exist."
    Write-Host 'DOC_IMPACT=FAIL_REPO_NOT_FOUND'
    exit 2
}

# Helper for robust git execution across Windows PowerShell 5.1 and pwsh
function Invoke-Git {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$CommandArgs
    )
    $prevPreference = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $output = & git -C $RepoPath @CommandArgs 2>$null
        return @($output)
    }
    finally {
        $ErrorActionPreference = $prevPreference
    }
}

# Helper to parse added lines from git diff without accepting diff headers or empty lines
function Get-AddedLinesFromDiff {
    param([string[]]$DiffLines)
    $added = @()
    $inHunk = $false
    foreach ($line in $DiffLines) {
        if ($line -match '^@@\s') {
            $inHunk = $true
            continue
        }
        if ($line -match '^diff --git\s') {
            $inHunk = $false
            continue
        }
        if ($inHunk -and $line.StartsWith('+')) {
            $content = $line.Substring(1)
            if (![string]::IsNullOrWhiteSpace($content)) {
                $added += $content
            }
        }
    }
    return $added
}

$null = Invoke-Git rev-parse --is-inside-work-tree
if ($LASTEXITCODE -ne 0) {
    Write-Host "DOC_ERROR: Path '$RepoPath' is not inside a git work tree."
    Write-Host 'DOC_IMPACT=FAIL_NOT_GIT_REPO'
    exit 2
}

# Align BEFORE_SHA and GITHUB_EVENT_BEFORE handling
$effectiveBefore = if (![string]::IsNullOrWhiteSpace($env:BEFORE_SHA)) {
    $env:BEFORE_SHA.Trim()
} elseif (![string]::IsNullOrWhiteSpace($env:GITHUB_EVENT_BEFORE)) {
    $env:GITHUB_EVENT_BEFORE.Trim()
} else {
    $null
}

if ([string]::IsNullOrWhiteSpace($BaseRef) -or $BaseRef -eq '0000000000000000000000000000000000000000') {
    if ($EventName -eq 'pull_request') {
        $BaseRef = if (![string]::IsNullOrWhiteSpace($env:GITHUB_BASE_REF)) { "origin/$($env:GITHUB_BASE_REF)" } else { 'origin/main' }
    } else {
        $BaseRef = if ($effectiveBefore -and $effectiveBefore -ne '0000000000000000000000000000000000000000') {
            $effectiveBefore
        } else {
            'HEAD~1'
        }
    }
}

# Validate BaseRef and HeadRef
$null = Invoke-Git rev-parse --verify "$BaseRef^{commit}"
if ($LASTEXITCODE -ne 0) {
    $null = Invoke-Git rev-parse --verify $BaseRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "DOC_ERROR: Base ref '$BaseRef' cannot be resolved in Git repository."
        Write-Host 'DOC_IMPACT=FAIL_INVALID_BASE_REF'
        exit 2
    }
}

$null = Invoke-Git rev-parse --verify "$HeadRef^{commit}"
if ($LASTEXITCODE -ne 0) {
    $null = Invoke-Git rev-parse --verify $HeadRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "DOC_ERROR: Head ref '$HeadRef' cannot be resolved in Git repository."
        Write-Host 'DOC_IMPACT=FAIL_INVALID_HEAD_REF'
        exit 2
    }
}

$baseSha = ((Invoke-Git rev-parse --verify $BaseRef) -join '').Trim()
$headSha = ((Invoke-Git rev-parse --verify $HeadRef) -join '').Trim()

# Safeguard against comparing a commit against itself (e.g. push to main where BaseRef == HEAD)
if ($baseSha -eq $headSha) {
    if ($Mode -eq 'Committed') {
        $null = Invoke-Git rev-parse --verify "$HeadRef~1"
        if ($LASTEXITCODE -eq 0) {
            $BaseRef = "$HeadRef~1"
            $baseSha = ((Invoke-Git rev-parse --verify $BaseRef) -join '').Trim()
        } else {
            Write-Host "DOC_ERROR: Base ref equals Head ref ($baseSha) and Head~1 cannot be resolved."
            Write-Host 'DOC_IMPACT=FAIL_BASE_REF_EQUALS_HEAD'
            exit 2
        }
    }
}

$raw = @()
$diffBase = @(Invoke-Git diff --name-only --diff-filter=ACMR "$BaseRef...$HeadRef")
if ($LASTEXITCODE -ne 0) {
    $diffBase = @(Invoke-Git diff --name-only --diff-filter=ACMR "$BaseRef..$HeadRef")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "DOC_ERROR: Failed to compute git diff between '$BaseRef' and '$HeadRef'."
        Write-Host 'DOC_IMPACT=FAIL_DIFF_BASE_FAILED'
        exit 2
    }
}
$raw += $diffBase

if ($Mode -eq 'WorkingTree') {
    $raw += @(Invoke-Git diff --name-only --diff-filter=ACMR)
    $raw += @(Invoke-Git diff --cached --name-only --diff-filter=ACMR)
    $raw += @(Invoke-Git ls-files --others --exclude-standard)
}

$paths = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($x in $raw) {
    if ($x) {
        $clean = $x.Trim().Replace('\', '/')
        if ($clean.Length -gt 0) {
            [void]$paths.Add($clean)
        }
    }
}
$all = @($paths)

$needSetup = $false
$needWorkflow = $false
$needData = $false

foreach ($p in $all) {
    if ($p -match '^(package(-lock)?\.json|\.nvmrc|\.npmrc|\.node-version|Dockerfile[^/]*|docker-compose[^/]*|\.env\.example|tsconfig(\..*)?\.json|vite\.config\..*|vitest\.config\..*|playwright\.config\..*)$' -or $p -match '^(scripts/orchestrator/|orchestrator/)') {
        $needSetup = $true
    }
    if ($p -match '^(AGENTS\.md|CONTRIBUTING\.md|ASSISTANT_START_HERE\.md|scripts/qa/|scripts/governance/|\.github/workflows/|\.github/CODEOWNERS$|docs/engineering/TEAM_DEVELOPMENT_WORKFLOW\.md$|docs/engineering/SHARED_OWNERSHIP_RULES\.md$|scripts/orchestrator/|orchestrator/)') {
        $needWorkflow = $true
    }
    if ($p -match '^(supabase/migrations/|scripts/db/|server\.ts|src/server/)') {
        $needData = $true
    }
    if ($p -match '^docs/team/(LOCAL_ENVIRONMENT_SETUP|LOCAL_ENGINEERING_WORKFLOW|DOCUMENTATION_MAINTENANCE_POLICY)\.md$') {
        $needData = $true
    }
}

if (!($needSetup -or $needWorkflow -or $needData)) {
    Write-Host 'DOC_IMPACT=NO_TRIGGER_DETECTED'
    exit 0
}

$required = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
[void]$required.Add('docs/team/DECISION_LOG.md')
[void]$required.Add('docs/team/LIVING_CONTEXT.md')

if ($needSetup) {
    [void]$required.Add('docs/team/LOCAL_ENVIRONMENT_SETUP.md')
}
if ($needWorkflow) {
    [void]$required.Add('docs/team/LOCAL_ENGINEERING_WORKFLOW.md')
}

$missing = @($required | Where-Object { ! $paths.Contains($_) })

# Check for formal exemption / waiver
$waiverCandidate = $null
if (![string]::IsNullOrWhiteSpace($Justification)) {
    if ($Justification -match '\[NO_DOC_IMPACT:\s*([^\r\n\]]+)\]' -or $Justification -match 'DOC_IMPACT=NONE:\s*([^\r\n\]]+)') {
        $waiverCandidate = $Matches[1].Trim()
    }
}
if (!$waiverCandidate -and ![string]::IsNullOrWhiteSpace($env:DOC_IMPACT_JUSTIFICATION)) {
    if ($env:DOC_IMPACT_JUSTIFICATION -match '\[NO_DOC_IMPACT:\s*([^\r\n\]]+)\]' -or $env:DOC_IMPACT_JUSTIFICATION -match 'DOC_IMPACT=NONE:\s*([^\r\n\]]+)') {
        $waiverCandidate = $Matches[1].Trim()
    } elseif ($env:DOC_IMPACT_JUSTIFICATION.Trim().Length -gt 0) {
        $waiverCandidate = $env:DOC_IMPACT_JUSTIFICATION.Trim()
    }
}
if (!$waiverCandidate) {
    $commitMsgs = @(Invoke-Git log "$BaseRef..$HeadRef" --pretty=%B)
    foreach ($msg in $commitMsgs) {
        if ($msg -match '\[NO_DOC_IMPACT:\s*([^\r\n\]]+)\]' -or $msg -match 'DOC_IMPACT=NONE:\s*([^\r\n\]]+)') {
            $waiverCandidate = $Matches[1].Trim()
            break
        }
    }
}

if ($missing.Count -gt 0) {
    if ($waiverCandidate) {
        $isTrivial = ($waiverCandidate -match '^(none|n/a|na|no doc impact|no_doc_impact|nil|null|test|fix|dummy|placeholder)$')
        if (!$isTrivial -and $waiverCandidate.Length -ge 15) {
            Write-Host ("DOC_IMPACT_TRIGGER=SETUP:{0};WORKFLOW:{1};DATA:{2}" -f $needSetup, $needWorkflow, $needData)
            Write-Host 'DOC_IMPACT=PASS_WAIVED_WITH_JUSTIFICATION'
            Write-Host "JUSTIFICATION=$waiverCandidate"
            exit 0
        } else {
            Write-Host ("DOC_IMPACT_TRIGGER=SETUP:{0};WORKFLOW:{1};DATA:{2}" -f $needSetup, $needWorkflow, $needData)
            foreach ($r in $required) {
                Write-Host ("DOC_REQUIRED={0} UPDATED={1}" -f $r, $paths.Contains($r))
            }
            Write-Host 'DOC_IMPACT=FAIL_INVALID_JUSTIFICATION'
            exit 2
        }
    } else {
        Write-Host ("DOC_IMPACT_TRIGGER=SETUP:{0};WORKFLOW:{1};DATA:{2}" -f $needSetup, $needWorkflow, $needData)
        foreach ($r in $required) {
            Write-Host ("DOC_REQUIRED={0} UPDATED={1}" -f $r, $paths.Contains($r))
        }
        Write-Host 'DOC_IMPACT=FAIL_MISSING_UPDATES'
        exit 2
    }
}

# Antifraud and structural content checks for required documents
foreach ($r in $required) {
    $fullPath = Join-Path $RepoPath $r
    if (!(Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        Write-Host "DOC_ERROR: Required document $r does not exist on disk."
        Write-Host 'DOC_IMPACT=FAIL_FILE_NOT_FOUND'
        exit 2
    }

    $fileItem = Get-Item -LiteralPath $fullPath
    if ($fileItem.Length -lt 100) {
        Write-Host "DOC_ERROR: Required document $r has size $($fileItem.Length) bytes (minimum 100 bytes required). Stubs or empty files are prohibited."
        Write-Host 'DOC_IMPACT=FAIL_FILE_TOO_SMALL'
        exit 2
    }

    $addedLines = @()
    if ($Mode -eq 'WorkingTree') {
        $untracked = @(Invoke-Git ls-files --others --exclude-standard)
        if ($untracked -contains $r) {
            $addedLines = @(Get-Content -LiteralPath $fullPath | Where-Object { ![string]::IsNullOrWhiteSpace($_) })
        } else {
            $diffLines = @(Invoke-Git diff -U0 "$BaseRef...$HeadRef" -- $r)
            if ($LASTEXITCODE -ne 0) {
                $diffLines = @(Invoke-Git diff -U0 "$BaseRef..$HeadRef" -- $r)
            }
            $diffLines += @(Invoke-Git diff -U0 -- $r)
            $diffLines += @(Invoke-Git diff -U0 --cached -- $r)
            $addedLines = Get-AddedLinesFromDiff $diffLines
        }
    } else {
        $diffLines = @(Invoke-Git diff -U0 "$BaseRef...$HeadRef" -- $r)
        if ($LASTEXITCODE -ne 0) {
            $diffLines = @(Invoke-Git diff -U0 "$BaseRef..$HeadRef" -- $r)
        }
        $addedLines = Get-AddedLinesFromDiff $diffLines
    }

    if ($addedLines.Count -eq 0) {
        Write-Host "DOC_ERROR: Required document $r has no additive modifications in git diff."
        Write-Host 'DOC_IMPACT=FAIL_EMPTY_DIFF'
        exit 2
    }

    if ($r -eq 'docs/team/DECISION_LOG.md') {
        $contentToCheck = if ($addedLines.Count -gt 0) { $addedLines -join "`n" } else { Get-Content -LiteralPath $fullPath -Raw }
        $hasDecisionEntry = ($contentToCheck -match '(D-\d{4}-\d{2}-\d{2}|###\s*\d{4}-\d{2}-\d{2})') -and ($contentToCheck -match '(PROPOSED|ACCEPTED|DECIDED|SUPERSEDED|IMPLEMENTED_LOCAL|PROD_VERIFIED)')
        if (!$hasDecisionEntry) {
            Write-Host "DOC_ERROR: docs/team/DECISION_LOG.md additions lack structured decision ID (D-YYYY-MM-DD-NN) or recognized status."
            Write-Host 'DOC_IMPACT=FAIL_DECISION_LOG_FORMAT'
            exit 2
        }
    }

    if ($r -eq 'docs/team/LIVING_CONTEXT.md') {
        $contentToCheck = if ($addedLines.Count -gt 0) { $addedLines -join "`n" } else { Get-Content -LiteralPath $fullPath -Raw }
        $hasContextEntry = ($contentToCheck -match '\d{4}-\d{2}-\d{2}') -or ($contentToCheck -match 'CCP-')
        if (!$hasContextEntry) {
            Write-Host "DOC_ERROR: docs/team/LIVING_CONTEXT.md additions lack recent date stamp or CCP ticket identifier."
            Write-Host 'DOC_IMPACT=FAIL_LIVING_CONTEXT_FORMAT'
            exit 2
        }
    }
}

Write-Host ("DOC_IMPACT_TRIGGER=SETUP:{0};WORKFLOW:{1};DATA:{2}" -f $needSetup, $needWorkflow, $needData)
foreach ($r in $required) {
    Write-Host ("DOC_REQUIRED={0} UPDATED={1} VALIDATED=True" -f $r, $paths.Contains($r))
}
Write-Host 'DOC_IMPACT=PASS_STRUCTURAL_CONTENT_VALIDATED'
Write-Host 'NOTE: Structural and antifraud checks passed. Full semantic validity requires human/codeowner review (no automated semantic validation asserted).'
exit 0
