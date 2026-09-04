# POST-UX A HOTFIX 05 — PowerShell Regex Interpolation Fix

## HOTFIX 04 failure

HOTFIX 04 used double-quoted regex strings containing:

- `$auditOutput`
- `$auditExit`
- `$LASTEXITCODE`

PowerShell interpolated those variables while constructing the regex. That
corrupted the expression and produced an invalid backreference such as `\1`.

## Fix

HOTFIX 05 uses single-quoted PowerShell regex strings so the `$...` tokens are
passed literally to .NET Regex.

The matcher remains constrained to the POST-UX A npm audit runner only.

## Replacement

The smoke resolves `npm.cmd` explicitly and runs:

`& $npmCmd audit --audit-level=high`

## Safety

No dependency changes.
No package.json changes.
No package-lock.json changes.
No runtime changes.
No npm install.
No npm audit fix.
