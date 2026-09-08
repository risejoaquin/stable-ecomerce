# POST-UX C HOTFIX 19 — Deferred toast critical path

## Evidence

HOTFIX 18.1 restored the best stable baseline (~2643 ms median LCP).

Current Lighthouse forensic evidence:
- TTFB ~109 ms
- resource load delay ~21 ms
- resource load duration ~157 ms
- element render delay ~102 ms
- forced reflow: none
- DOM: 163 elements
- network longest chain: ~273 ms, 0 LCP savings
- render-blocking CSS: 0 LCP savings
- unused JavaScript: ~110 ms LCP opportunity
- core vendor script evaluation: ~217 ms

Source inspection shows `react-hot-toast` is imported eagerly by the application root, PDP and checkout hook, while the visual `Toaster` is mounted globally for every route.

## Change

- Add `src/lib/deferred-toast.ts`.
- Replace eager `toast` imports in the root, PDP and checkout hook with a dynamic-import bridge.
- Mount `Toaster` only after `requestIdleCallback` (timeout fallback).
- Remove unused eager `useValidateCoupon` import from `App.tsx`.

## Preserved

- Toast success/error/promise semantics.
- Global toaster remains available after the critical render.
- React/React DOM/Router/Lucide stable vendor graph remains unchanged.
- HOTFIX 16 product bootstrap remains unchanged.
- HOTFIX 17 native SEO remains unchanged.
- No dependency changes; no `npm install`.
- No server/API/CSP/image/CSS changes.

## Expected result

The `react-hot-toast` visual implementation / goober styling runtime should move out of the initial critical vendor or at minimum execute after the LCP-critical phase. Production Lighthouse will determine whether the remaining ~110 ms unused-JS opportunity falls.
