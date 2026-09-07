# POST-UX C HOTFIX 15 — Server-assisted PDP LCP preload

Lighthouse shows the initial PDP HTML completing around 146 ms while `/api/products/:id` extends the critical chain to about 686 ms. HOTFIX 14.2 improves client discovery, but the browser still waits for the product API response before it knows the real image URL.

This hotfix keeps the React SPA architecture intact and changes only production HTML delivery for `/product/:uuid/...`.

For that route, Express:
- reads `dist/index.html`;
- queries only `images` for the requested product;
- injects `<link rel="preload" as="image">` into the initial HTML;
- mirrors the existing responsive 480/800/1200 candidates;
- preserves `imagesizes="(max-width: 768px) 100vw, 50vw"`;
- preserves `fetchpriority="high"`.

If the lookup fails, the normal SPA HTML is still returned and HOTFIX 11/14.2 client behavior remains available.

No dependency, CSP, API contract, React Query, service worker, or React SSR migration changes.
