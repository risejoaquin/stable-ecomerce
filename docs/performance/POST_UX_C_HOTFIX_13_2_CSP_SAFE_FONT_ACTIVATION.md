# POST-UX C HOTFIX 13.2 — CSP-safe brand font activation

## Cause
HOTFIX 13.1 improved median PDP LCP materially, but its `onload="this.media='all'"` HTML event handler is blocked by the production CSP directive `script-src-attr 'none'`.

Lighthouse consequently reports `errors-in-console` and `inspector-issues` as failed Best Practices audits.

## Fix
- Keep the non-blocking `media="print"` font stylesheet technique.
- Remove the inline `onload` event handler.
- Give the stylesheet a stable `selfcare-brand-fonts` id.
- Add a tiny same-origin deferred script at `/brand-fonts-loader.js`.
- The external script promotes the stylesheet to `media="all"` on load, or immediately when already loaded.
- Preserve the `noscript` fallback.
- Do not weaken CSP and do not add `unsafe-inline`/`unsafe-hashes`.
- No dependency changes.

## Validation
Run HOTFIX 13.2 smoke, build, established regressions, deploy, production smoke, then Lighthouse mobile x5. Best Practices should recover if the CSP violation was the only regression.
