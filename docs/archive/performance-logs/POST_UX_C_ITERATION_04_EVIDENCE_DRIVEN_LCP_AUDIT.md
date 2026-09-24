# POST-UX C — Iteration 04: Evidence-Driven LCP Resource Audit

Iteration 02 proved Product Detail can improve through resource prioritization.
Iteration 03 restored Home desktop performance, but removing StoreConfig from the
critical Product render gate did not materially improve mobile LCP.

This iteration makes no runtime change. It reads raw Lighthouse JSON reports from
`.tmp/post-ux-c-local` and extracts:

- LCP element snippet when available
- document transfer/duration
- largest image and transfer size
- slowest image and duration
- server response opportunity
- responsive/optimized/modern image opportunities
- offscreen image opportunity
- unused JavaScript opportunity
- LCP lazy-load audit

Outputs:

- `.tmp/post-ux-c-analysis/post-ux-c-lcp-summary.csv`
- `.tmp/post-ux-c-analysis/post-ux-c-image-network.csv`
- `.tmp/post-ux-c-analysis/post-ux-c-opportunities.csv`

No dependency changes. Do not run `npm install`.

The result determines whether the next iteration targets image compression/CDN,
API latency, render delay, or JavaScript competition.
