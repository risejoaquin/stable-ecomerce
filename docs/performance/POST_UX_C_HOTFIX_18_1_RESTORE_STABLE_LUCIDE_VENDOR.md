# POST-UX C HOTFIX 18.1 — Restore stable Lucide vendor graph

## Production evidence

HOTFIX 18 reduced the raw core vendor from about 269 KB to about 239 KB and moved Lucide modules into natural Rollup boundaries.

However, production Lighthouse did not improve:

- HOTFIX 17 median LCP: ~2645 ms
- HOTFIX 18 production set A median: 2708.272 ms
- HOTFIX 18 production set B median: 2702.623 ms

The optimization therefore regressed the user-facing metric despite shrinking the vendor.

## Decision

HOTFIX 18 is superseded.

Restore `lucide-react` to the proven stable vendor group together with React, React DOM and React Router.

This preserves:
- the historical circular-chunk/blank-screen fix;
- HOTFIX 17 native SEO optimization;
- HOTFIX 16 PDP bootstrap optimization;
- all existing API/image/CSP behavior.

## Validation

After applying:
1. source smoke;
2. production build;
3. post-build vendor smoke;
4. HOTFIX 17 and core regression smokes;
5. deploy;
6. production smoke;
7. Lighthouse x5.

Expected build shape should return close to HOTFIX 17:
- core vendor ~269 KB raw;
- Lucide licenses present in the core vendor;
- index chunk close to ~62 KB raw.
