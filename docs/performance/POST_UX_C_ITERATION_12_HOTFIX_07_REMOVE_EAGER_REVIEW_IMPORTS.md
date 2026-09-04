# POST-UX C Iteration 12 HOTFIX 07 — Remove Eager Review Imports

HOTFIX 06 restored the PDP lazy-review declarations and renders, but its generic
replacement helper treated an empty replacement string as already present because
`Contains("")` is always true.

As a result, the two static imports could remain even though the lazy declarations
were restored.

This hotfix removes only:
- `ReviewList` eager import
- `ReviewForm` eager import

It preserves the lazy dynamic imports and Suspense renders.

No dependency changes.
No Vite changes.
No Sentry/Radix changes.
Do not run npm install.
