# POST-UX C Iteration 12 HOTFIX 05 — Restore Deferred Observability Bootstrap

## Evidence

Fresh Iteration 12 Lighthouse output showed:
- `vendor-observability` in 16 reports;
- ~89.05 KB average transferred;
- ~78.02 KB average wasted;
- 87.6% average waste.

The current `src/main.tsx` had regressed to an eager:

`import * as Sentry from '@sentry/react'`

followed by synchronous `Sentry.init(...)`.

This is a regression of the previously validated POST-UX C Iteration 06
deferred-observability behavior.

## Fix

Restore:
- DSN guard;
- dynamic `import('@sentry/react')`;
- initialization after window load;
- requestIdleCallback with timeout 2500;
- setTimeout fallback 1500;
- existing tracing/replay sample rates;
- service worker behavior.

## Scope

No dependency changes.
No package.json/package-lock changes.
No Vite chunk-rule changes.
No npm install.
