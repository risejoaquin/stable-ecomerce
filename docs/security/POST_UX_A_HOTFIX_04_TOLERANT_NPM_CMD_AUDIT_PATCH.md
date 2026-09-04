# POST-UX A HOTFIX 04 — Tolerant npm.cmd Audit Runner Patch

HOTFIX 03 failed because it required an exact multiline anchor in
`scripts/qa/smoke-post-ux-a.ps1`.

HOTFIX 04 matches only the audit-runner section with a constrained regex and
accepts the known `cmd.exe` or direct `npm` variants.

It replaces that section with explicit `npm.cmd` resolution and:

`& $npmCmd audit --audit-level=high`

No package.json, package-lock.json, runtime code, or dependencies are changed.
It does not run `npm audit fix`.
