# POST-UX C HOTFIX UTF-8 03 - PowerShell HOME collision

## Cause

The UTF-8 repair itself completed successfully, but the validation smoke failed
because it assigned a variable named `$home`.

Windows PowerShell variable names are case-insensitive, so `$home` resolves to
the automatic `$HOME` variable, which is read-only in this session.

## Fix

The smoke now uses:

- `$homeSource`
- `$productSource`

No source/runtime files are changed by this hotfix.

## Status

The UTF-8 repair already succeeded before this hotfix:
- HomePage mojibake score: 35 -> 0
- ProductDetailPage mojibake score: 15 -> 0

This patch only repairs the validation harness.

## Dependencies

None. Do not run `npm install`.
