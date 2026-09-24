# POST-UX C — HOTFIX UTF-8 Storefront Integrity

## Root cause

PowerShell patch scripts used `Get-Content` / `Set-Content` in Windows PowerShell.
The current environment interpreted UTF-8 source text through an incompatible
default encoding and rewrote accented Spanish copy as mojibake.

Examples observed in GitHub:

- `catÃ¡logo`
- `cÃ¡lida`
- `EnvÃ­os`
- `SelecciÃ³n`
- `Â·`
- `opciÃ³n`
- `ReseÃ±as`
- `âˆ’`

## Correction

The repair script uses explicit .NET UTF-8 encoding:

- `[System.IO.File]::ReadAllText`
- `[System.IO.File]::WriteAllText`
- `UTF8Encoding(false)`

No default PowerShell text encoding is used.

The repair preserves the POST-UX C performance changes already validated:
Product Detail high-priority LCP image and secondary-request deferral remain;
the Home high-priority hero rollback remains.

## Prevention

The new smoke fails if common mojibake markers are found in either HomePage or
ProductDetailPage.

Future patchers that rewrite source files should use explicit UTF-8 .NET I/O
instead of Windows PowerShell `Get-Content` / `Set-Content` defaults.

## Dependencies

None. Do not run `npm install`.
