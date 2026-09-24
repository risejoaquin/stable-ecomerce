# POST-UX C HOTFIX 18 — Lucide lazy-boundary release

## Evidence

After HOTFIX 17, Lighthouse still reports the core vendor as the dominant unused-JS opportunity. Inspection of the production bundle shows dozens of `lucide-react` icon modules inside the same critical chunk as React.

The existing stable-vendor fix must be preserved: React, React DOM and React Router remain together. A previous split of the core React graph produced a production circular chunk and blank screen.

## Change

`vite.config.ts` now special-cases `lucide-react` before the stable React vendor rule and returns `undefined`, allowing Rollup to keep lucide modules in their natural static/lazy boundaries.

This is intentionally **not** a single `vendor-icons` chunk, because a monolithic icon chunk would still be pulled into startup by the few icons imported by the application shell.

## Safety

- React, React DOM, React Router and React Router DOM remain in the proven stable `vendor`.
- No dependency changes.
- No server/API/CSP/SEO/image changes.
- Existing `/lucide-react/` guard marker remains present, so older QA source contracts continue to recognize lucide handling.
- A dedicated post-build smoke verifies the core vendor retains React/Router but contains zero lucide license modules.

## Expected result

- Core vendor materially smaller than HOTFIX 17 (~269079 bytes raw).
- `@license lucide-react` count in the core vendor becomes zero.
- Lucide modules remain present in natural route/application chunks.
- Lower initial unused JS and vendor evaluation cost.
