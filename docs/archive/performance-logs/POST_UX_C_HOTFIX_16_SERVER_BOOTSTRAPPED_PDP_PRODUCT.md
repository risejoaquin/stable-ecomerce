# POST-UX C HOTFIX 16 — Server-bootstrapped PDP product

## Evidence
HOTFIX 15.1 reduced the image resource load delay to about 18 ms and restored TTFB to about 121 ms in the sampled median run. The remaining critical network chain is `/api/products/:id`, which still completes around 453 ms and gates the React PDP from leaving its loading state.

## Change
The production PDP route now caches the full product object for 5 minutes, uses it for the existing server-side image preload, and injects the same product as inert `application/json` data into the initial HTML.

HOTFIX 11 first attempts to consume that server bootstrap. Only when the bootstrap is missing/invalid does it fall back to the existing `/api/products/:id` early fetch.

## Expected effect
Warm PDP requests should:
- preserve the server-side image preload;
- avoid the initial duplicate product API request;
- let React Query resolve immediately from the server bootstrap;
- create the LCP `<img>` earlier;
- reduce element render delay / critical chain length.

## Safety
No React SSR migration, dependency change, API contract change, CSP weakening, service-worker change, or image-pipeline change.
