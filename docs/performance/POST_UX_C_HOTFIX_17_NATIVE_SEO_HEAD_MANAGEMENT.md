# POST-UX C HOTFIX 17 — Native SEO head management

## Evidence
Lighthouse attributes about 150-170 ms of LCP opportunity to the main vendor bundle. The bundle contains `react-helmet-async`, and `App.tsx` mounts `HelmetProvider` globally, forcing that library into the startup path on every route.

## Change
- Remove global `HelmetProvider` from `App.tsx`.
- Replace `SEO.tsx` Helmet rendering with native `document.head` management in `useEffect`.
- Preserve title, description, robots, canonical, Open Graph, Twitter and JSON-LD behavior.
- Keep `react-helmet-async` declared in package.json for now; no dependency mutation is required for this performance experiment.

## Safety
- No React/router/lucide chunk split.
- No dependency install/removal.
- No server/API/CSP/service-worker/image pipeline changes.
- HOTFIX 16 server-bootstrap path is preserved.

## Expected measurement
After build, `vendor-*.js` should shrink and Helmet implementation code should disappear from the critical vendor bundle. Lighthouse should show reduced unused JS and lower vendor evaluation cost.
