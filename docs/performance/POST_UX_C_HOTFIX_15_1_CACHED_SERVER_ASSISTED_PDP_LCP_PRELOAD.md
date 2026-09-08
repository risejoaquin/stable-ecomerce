# POST-UX C HOTFIX 15.1 — Cached server-assisted PDP LCP preload

HOTFIX 15 reduced `resourceLoadDelay` from roughly 561 ms to roughly 107 ms, proving the server-side preload is effective. However, the document TTFB increased and production document timing showed variance from roughly 155 ms to more than 330 ms.

HOTFIX 15.1 adds a 5-minute in-memory cache for `productId -> imageUrl`, so warm PDP document requests avoid the Supabase lookup. It also prevents HOTFIX 14.2 from inserting a second preload when the server-side preload is already present.

No dependency, API, CSP, React SSR, React Query, service worker, or image-pipeline contract changes.
