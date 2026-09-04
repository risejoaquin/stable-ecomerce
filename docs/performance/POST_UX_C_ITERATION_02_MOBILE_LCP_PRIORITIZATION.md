# POST-UX C — Iteration 02: Mobile LCP Prioritization

## Baseline evidence

### Home
- mobile Performance median: ~0.76
- mobile LCP median: ~4.37 s
- mobile CLS: 0
- mobile TBT median: ~118 ms
- desktop LCP median: ~1.29 s

### Search
- mobile Performance median: ~0.74
- mobile LCP median: ~4.39 s
- mobile CLS: 0
- mobile TBT median: ~270 ms
- one TBT outlier reached 1923 ms
- desktop LCP median: ~1.35 s

### Product Detail
- mobile Performance median: ~0.59
- mobile LCP median: ~7.88 s
- mobile CLS: 0
- mobile TBT median: ~170 ms
- desktop LCP median: ~2.29 s

## Decision

CLS is already healthy and desktop Home/Search are healthy. The first optimization therefore targets mobile LCP without layout or bundle restructuring.

## Changes

1. Home hero product image:
   - `fetchPriority="high"`
   - `loading="eager"`
   - `decoding="async"`

2. Product Detail primary image:
   - same high/eager LCP policy.

3. Product Detail thumbnails:
   - `loading="lazy"`
   - `fetchPriority="low"`
   - `decoding="async"`

4. Product Detail secondary network work:
   - rating request deferred until idle;
   - similar-products request deferred until idle;
   - timeout fallback prevents indefinite starvation.

## Important limitation

Both Home and Product Detail are client-rendered and the image URL is learned only after product API data arrives. `fetchPriority` improves scheduling after discovery but cannot eliminate the API-before-image dependency. If LCP remains substantially above budget after this iteration, the next investigation should inspect image transfer size/host latency and the client-rendered data dependency.

## Non-goals

No changes to:
- Vite/manualChunks
- service worker
- checkout
- Stripe
- auth
- dependencies
- layout geometry

## Closure gate

Rebuild and run regressions locally, deploy, then repeat the same 3x mobile/desktop Lighthouse measurements. Compare medians rather than a single run.
