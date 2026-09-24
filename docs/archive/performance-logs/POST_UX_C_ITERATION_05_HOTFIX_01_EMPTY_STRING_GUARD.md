# POST-UX C Iteration 05 HOTFIX 01 - Empty-string patch guard

## Root cause

The Iteration 05 generic replacement helper checked whether a patch was already
applied with:

`$content.Contains($New)`

For import removals, `$New` was the empty string.

Every .NET string contains the empty string, so all eager-import removals were
incorrectly reported as already applied.

This produced:

- `SKIP already applied` for Home below-the-fold imports
- `SKIP already applied` for Product review imports

while the imports were still present.

## Fix

This hotfix uses a dedicated `Remove-Utf8Exact` function that:

1. checks only whether the old import exists;
2. removes it directly;
3. writes with explicit UTF-8 no-BOM;
4. reports `SKIP already removed` only when the old import is actually absent.

## Runtime impact

No new functional changes beyond completing the intended Iteration 05 import
removal.

The lazy declarations/renders already applied by Iteration 05 are preserved.

## Dependencies

None. Do not run `npm install`.
