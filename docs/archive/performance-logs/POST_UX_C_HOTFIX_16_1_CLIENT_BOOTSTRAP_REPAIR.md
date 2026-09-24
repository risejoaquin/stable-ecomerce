# POST-UX C HOTFIX 16.1 — Client bootstrap repair

HOTFIX 16 partially applied: `server.ts` was successfully upgraded to cache/inject the full PDP product, but `index.html` was not changed because the original patcher expected the pre-HOTFIX-15.1 bootstrap shape.

HOTFIX 16.1 repairs only the client side against the current HOTFIX 15.1 HTML.

The early PDP bootstrap now:
- reads `#selfcare-server-product-bootstrap`;
- parses it as JSON;
- resolves immediately with `Promise.resolve(serverProduct)` when the ID matches;
- preserves `/api/products/:id` as fallback;
- preserves HOTFIX 15.1 duplicate-preload protection;
- preserves `window.__SELFCARE_EARLY_PRODUCT__`.

No dependency, API, CSP, React SSR, service-worker, or image-pipeline changes.
