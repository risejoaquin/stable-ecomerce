# POST-UX C HOTFIX 14.2 — Safe early PDP LCP preload repair

HOTFIX 14.1 failed before modifying `index.html` because its patch generator contained a nested JavaScript template interpolation (`${base}`) inside the patcher's own template string. Node evaluated that interpolation while running the patcher, where `base` does not exist.

HOTFIX 14.2 removes nested template interpolation entirely. The generated browser code builds responsive URLs with string concatenation instead.

The patch remains CRLF/LF tolerant and keeps the exact HOTFIX 14 optimization target: preload the first PDP product image as soon as HOTFIX 11's early product request resolves.

No dependency, API, React Query, CSP, service worker, server, or visual contract changes.
