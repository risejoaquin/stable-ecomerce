# POST-UX C HOTFIX 03 — npm exec Lighthouse Runner

## Cause

`npx` continued to fail on this Windows/npm installation with:

`could not determine executable to run`

The failure occurs before Lighthouse launches Chrome.

## Correction

The runner no longer uses the `npx` executable. It now invokes npm directly:

`npm exec --yes --package=lighthouse -- lighthouse <url> ...`

This follows npm's documented explicit package/binary execution model.

The runner also temporarily relaxes PowerShell's `ErrorActionPreference` only
around the external npm process so stderr from npm does not terminate the script
before the exit code can be classified.

## Failure classes

- `NPM_EXEC_RESOLUTION_FAILURE`
- `CHROME_LAUNCH_FAILURE`
- `LIGHTHOUSE_EXECUTION_FAILURE`

## Dependency impact

No project dependency or lockfile change.

Do not run `npm install`.
