# POST-UX C HOTFIX 16.3 — Bootstrap ordering repair

## Problem found during Git review
HOTFIX 16 injected the inert `#selfcare-server-product-bootstrap` immediately before `</body>`, but HOTFIX 11's inline bootstrap consumer appears earlier in the document.

Therefore, at execution time, `document.getElementById('selfcare-server-product-bootstrap')` could return `null`, causing the code to fall back to `/api/products/:id` and defeating the intended optimization even though source-string smokes passed.

## Repair
The server now injects the inert `application/json` product bootstrap immediately before `</head>`.

This guarantees the element exists before the body-side HOTFIX 11 consumer executes.

The JSON remains non-executable and CSP-safe.

## Scope
- Runtime change: `server.ts` injection position only.
- QA hardening: HOTFIX 16/16.1 smokes verify head injection contract.
- No dependency, API, CSP, React SSR, service-worker, or image-pipeline changes.
