# POST-UX A — Dependency & Security Hardening

## Scope

- Pin vulnerable transitive `brace-expansion` to patched `5.0.9` using npm `overrides`.
- Harden Multer upload parsing limits while preserving the existing 5 MB image upload contract.
- Add an auditable PowerShell gate that fails on remaining HIGH/CRITICAL npm advisories.

## Security decisions

- No blind `npm audit fix`.
- No major dependency upgrades in this change.
- `multer` remains on the existing `^2.2.0` line.
- Upload parser limits: 1 file, 8 non-file fields, 10 total parts, nesting depth 2.
- Existing JPEG/PNG/WebP allow-list remains unchanged.

## Required dependency refresh

`package.json` dependency resolution changed via `overrides`, therefore run `npm install` once so `package-lock.json` resolves `brace-expansion@5.0.9`.

## Closure gate

`smoke-post-ux-a.ps1` validates source hardening and then runs `npm audit --audit-level=high`. POST-UX A is not CLOSED until HIGH and CRITICAL advisories are zero.
