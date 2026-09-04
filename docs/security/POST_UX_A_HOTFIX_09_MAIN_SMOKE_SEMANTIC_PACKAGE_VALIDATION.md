# POST-UX A HOTFIX 09 — Main Smoke Semantic package.json Validation

HOTFIX 07 converged the dependency tree and passed the HIGH/CRITICAL audit gate.
HOTFIX 08 repaired the HOTFIX 07 validation smoke.

The original `smoke-post-ux-a.ps1` still used exact textual assertions against
`package.json`, so it failed after the repair script reserialized JSON formatting.

HOTFIX 09 replaces only those package.json text assertions with semantic
`ConvertFrom-Json` checks. Existing package-lock validation, Multer guards,
documentation checks, and the explicit npm.cmd audit gate remain intact.

No dependency changes. Do not run `npm install`.
