# POST-UX C HOTFIX UTF-8 02 - ASCII-safe repair

## Root cause

The first UTF-8 repair script embedded mojibake and accented/non-ASCII literals
directly inside a Windows PowerShell `.ps1` file.

On this environment the script source itself was reinterpreted before parsing,
producing corrupted tokens and a `ParserError`.

## Fix

The replacement repair script is intentionally ASCII-only.

It:

1. reads target TSX files explicitly as UTF-8;
2. scores common mojibake lead code points;
3. attempts Windows-1252 -> UTF-8 recovery using .NET encodings;
4. accepts a repair pass only when the mojibake score decreases;
5. writes UTF-8 without BOM;
6. never embeds corrupted strings in the PowerShell source.

## Safety

The script refuses to write when the transformation does not improve the
mojibake score.

The smoke also verifies that the Product Detail performance changes remain and
that the Home hero rollback is preserved.

## Dependencies

None. Do not run `npm install`.
