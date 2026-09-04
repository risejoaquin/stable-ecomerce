# POST-UX A HOTFIX 07 — Dependency Resolution Convergence

## Situation

The corrected audit harness reports HIGH vulnerabilities in packages that are
already pinned to patched versions in the approved project manifest.

This indicates local dependency/lockfile drift rather than a missing security
policy decision.

## Approved versions re-enforced

Direct:
- dompurify ^3.4.14
- react-router-dom ^7.18.2

Overrides:
- brace-expansion 5.0.9
- browserslist 4.28.8
- ip-address 10.5.0
- nanoid 3.3.18
- postcss 8.5.28
- qs 6.16.0
- react-router 7.18.2
- undici 7.29.0

## Workflow

The repair script:
1. rewrites only the approved dependency fields in package.json;
2. runs npm.cmd install;
3. verifies installed versions package by package;
4. runs the HIGH/CRITICAL npm audit gate.

## Important

This hotfix intentionally changes dependency resolution, so `npm install` is
required here.

Do not run `npm audit fix`.
