# POST-UX B HOTFIX 01 — QA Release E Stable Vendor Guard

## Cause

`smoke-qa-release-e.ps1` depended on the literal comment text:

`Cannot set properties of undefined`

inside `vite.config.ts`.

POST-UX B changed the bundle configuration while preserving the real regression
guard, so the old text-based assertion became stale and produced a false failure.

## Correction

The smoke now validates the actual stable-vendor contract:

- no `vendor-react` chunk;
- `/react/` present in the protected vendor group;
- `/react-dom/` present;
- `/react-router/` present;
- `/react-router-dom/` present;
- `/lucide-react/` present;
- the guarded branch returns `vendor`.

No production behavior, dependency, service worker, Stripe, checkout, or runtime
code is changed by this hotfix.

## Dependency impact

None. `npm install` is not required.
