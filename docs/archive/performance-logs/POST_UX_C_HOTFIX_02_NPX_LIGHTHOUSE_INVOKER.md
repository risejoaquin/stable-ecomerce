# POST-UX C HOTFIX 02 — NPX Lighthouse Invoker

## Cause

The local Lighthouse fallback failed before Chrome was launched with:

`npm error could not determine executable to run`

This is an npm/npx executable inference problem, not a Lighthouse metric failure and not evidence of a production regression.

## Correction

The runner now invokes Lighthouse explicitly through npm 11-compatible npx syntax:

`npx --yes --package=lighthouse -- lighthouse <url> ...`

The script also classifies failures as:

- `NPX_RESOLUTION_FAILURE`
- `CHROME_LAUNCH_FAILURE`
- `LIGHTHOUSE_EXECUTION_FAILURE`

so the next diagnostic identifies the real failing layer.

## Dependency impact

No application dependency is added and no project lockfile is changed.

Do not run `npm install`.
