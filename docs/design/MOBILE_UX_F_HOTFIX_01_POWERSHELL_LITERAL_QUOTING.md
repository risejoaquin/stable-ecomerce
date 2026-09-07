# MOBILE/UX F HOTFIX 01 — PowerShell Literal Quoting

## Cause

The MOBILE/UX F smoke used C/JavaScript-style `\"` escapes inside PowerShell double-quoted strings. PowerShell does not use backslash to escape a double quote, so the assert arguments were parsed incorrectly and the validator searched for literal backslashes instead of the JSX attribute.

## Fix

Changed JSX attribute assertions in `scripts/qa/smoke-mobile-ux-f.ps1` to PowerShell single-quoted literals, preserving the embedded double quotes exactly.

## Runtime impact

None. This hotfix changes only QA validation/documentation. No React, CSS, API, Stripe, service worker, email, auth, or database behavior is modified.
