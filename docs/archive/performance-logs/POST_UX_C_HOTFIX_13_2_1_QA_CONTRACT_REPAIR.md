# POST-UX C HOTFIX 13.2.1 — Inherited QA contract repair

HOTFIX 13.2 intentionally removes the CSP-blocked inline `onload` handler introduced by HOTFIX 13.1 and replaces it with a same-origin external loader.

The inherited HOTFIX 13.1 smoke still required the exact inline handler, so it produced a false regression after the security fix.

This QA-only repair removes that obsolete implementation-specific assertion while preserving the original HOTFIX 13.1 guarantees: Google Fonts remain off the blocking CSS import path, the stylesheet remains `media="print"`, the noscript fallback remains present, and HOTFIX 13.2's CSP-safe loader is separately validated.

No storefront, server, dependency, image, React Query, service worker, Vite chunk, or CSP behavior is changed.
