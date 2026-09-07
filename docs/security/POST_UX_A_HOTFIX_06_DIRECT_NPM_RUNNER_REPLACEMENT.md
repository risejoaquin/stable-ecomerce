# POST-UX A HOTFIX 06 — Direct npm Runner Replacement

## Exact local variant detected

The local `smoke-post-ux-a.ps1` contains:

`& npm audit --audit-level=high`

It does not use `$auditOutput` or `$auditExit`.

That is why previous hotfixes looking for a multi-line captured-output runner
did not match.

## Fix

HOTFIX 06 performs a direct literal replacement of that exact command with:

- `Get-Command npm.cmd`
- `%ProgramFiles%\nodejs\npm.cmd` fallback
- `& $npmCmd audit --audit-level=high`

The existing `$LASTEXITCODE` gate remains untouched.

## Safety

No dependency changes.
No package.json changes.
No package-lock.json changes.
No runtime changes.
No npm install.
No npm audit fix.
