# POST-UX A HOTFIX 03 — Explicit npm.cmd Audit Runner

## Problem

`smoke-post-ux-a.ps1` could fail on Windows PowerShell with:

`Unknown command: "pm"`

The dependency/security checks before the audit passed, including the
`brace-expansion` override. The failure occurred in the audit harness, not in
the dependency graph.

## Root cause

The POST-UX A smoke still delegated the audit through `cmd.exe` using the
generic `npm` command. Other POST-UX tooling already proved that resolving
`npm.cmd` explicitly avoids Windows PowerShell / command-shim argument
mangling.

## Fix

The smoke now:

1. resolves `npm.cmd` with `Get-Command npm.cmd`;
2. falls back to `%ProgramFiles%\nodejs\npm.cmd`;
3. runs `& $npmCmd audit --audit-level=high`;
4. prints the resolved `NPM_CMD` path.

## Safety

This hotfix does not:

- alter package.json
- alter package-lock.json
- install dependencies
- run npm audit fix
- change runtime code

## Note about the recent npm install

Because `npm install` reported changed packages, treat `package-lock.json` as
modified until verified. Run the corrected security smoke and inspect
`git diff -- package-lock.json package.json` before committing.
