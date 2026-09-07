# POST-UX A HOTFIX 08 — Semantic package.json Smoke Validation

## Evidence

HOTFIX 07 repair completed successfully:

- approved dependency resolutions enforced
- npm.cmd install completed
- all exact overrides verified
- dompurify 3.4.14 installed
- react-router-dom 7.18.3 installed
- HIGH/CRITICAL npm audit gate passed
- only one LOW body-parser advisory remains

The subsequent HOTFIX 07 smoke failed on the DOMPurify floor because it used
exact text matching against package.json.

The repair script serializes package.json via ConvertTo-Json, so whitespace /
formatting can change without changing any dependency value.

## Fix

HOTFIX 08 changes only the HOTFIX 07 smoke validator. It now parses package.json
with ConvertFrom-Json and compares semantic property values.

No dependency changes.
No npm install.
No runtime changes.
No package.json/package-lock.json changes.
