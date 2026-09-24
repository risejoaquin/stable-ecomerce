# POST-UX C - Iteration 06: Deferred Observability Bootstrap

## Evidence

Iteration 05 successfully split several below-the-fold components into small
lazy chunks, but Lighthouse still reported essentially unchanged unused
JavaScript:

- Home/Search: about 129 KiB
- Product Detail: about 162 KiB

The repository entrypoint imports `@sentry/react` eagerly and initializes Sentry
before React mounts. Vite places Sentry in `vendor-observability`, which is about
280 KiB uncompressed in the current production build.

This is a much stronger candidate for initial unused JavaScript than the small
feature modules separated in Iteration 05.

## Change

`src/main.tsx` no longer statically imports `@sentry/react`.

Observability is bootstrapped through a dynamic import:

1. only when `VITE_SENTRY_DSN` exists;
2. after window `load`;
3. during `requestIdleCallback` when supported;
4. with bounded timeout fallback;
5. failures are isolated and never block storefront startup.

## Preserved behavior

The following Sentry configuration remains unchanged:

- browser tracing
- session replay
- tracesSampleRate = 1.0
- replaysSessionSampleRate = 0.1
- replaysOnErrorSampleRate = 1.0

The custom application `ErrorBoundary` remains synchronous and still protects
React rendering before Sentry is available.

## Tradeoff

Very early boot errors that occur before deferred Sentry initialization may not
be sent to Sentry. This is intentional for this performance experiment and is
partially mitigated by the existing synchronous application ErrorBoundary.

## Non-goals

No changes to:
- Sentry dependency versions
- Vite stable vendor grouping
- React/Router/lucide vendor contract
- service worker
- auth
- Stripe/checkout
- storefront UI

## Dependencies

None. Do not run `npm install`.

## Validation gate

After production deploy:

1. repeat Home/Search 3x mobile + desktop;
2. repeat Product Detail 3x mobile + desktop using a fresh run;
3. rerun the LCP/unused-JS analyzer;
4. confirm whether `vendor-observability` is no longer part of critical startup
   and whether Lighthouse unused-JS savings decrease.
