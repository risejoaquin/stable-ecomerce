# POST-UX C HOTFIX 04 — Windows npm.cmd Shim Hardening

## Root cause

The command syntax used by POST-UX C is supported by npm:

`npm exec --package=lighthouse -- lighthouse ...`

However, on this Windows/PowerShell installation invoking `npm` by name produced
argument corruption, including:

`Unknown command: "pm"`

This means npm started, but the command line reached it incorrectly. The failure
is in the Windows PowerShell command/shim layer, before Lighthouse or Chrome.

## Correction

The runner now resolves and invokes `npm.cmd` explicitly instead of `npm` or
`npx`.

Resolution order:

1. `Get-Command npm.cmd`
2. `%ProgramFiles%\nodejs\npm.cmd`

This bypasses `npm.ps1` and avoids PowerShell wrapper argument forwarding.

## Diagnostic layers

POST-UX C now distinguishes:

1. PowerShell execution policy / downloaded-file blocking
2. npm.cmd command execution
3. Chrome launch
4. Lighthouse execution
5. external PageSpeed/CrUX service availability

## Dependency impact

None.

Do not run `npm install`.
