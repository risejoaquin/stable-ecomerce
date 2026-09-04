# POST-UX C - Iteration 10: Protected Vendor Composition Diagnostic

## Current evidence

After Iteration 09, storefront Lighthouse no longer reports `vendor-charts` or
`admin-pages` as unused JavaScript.

The only remaining common unused-JS source is the protected vendor chunk:

- Home/Search: about 49.5 KiB wasted
- Product Detail: about 59.5 KiB wasted

The protected vendor includes React, ReactDOM, React Router, react-router-dom
and lucide-react. These libraries must not be split blindly because an earlier
production split caused a circular-chunk blank screen.

## Goal

Attribute the protected vendor chunk by exact package and Rollup module before
changing chunk topology.

## Analyzer

`scripts/qa/analyze-post-ux-c-vendor-modules.mjs`

It performs an in-memory Vite build (`write:false`) and reads Rollup
`OutputChunk.modules` metadata.

Outputs:

- package rendered size
- module rendered size
- module count
- protected-package marker

Files:

- `.tmp/post-ux-c-vendor-modules/post-ux-c-vendor-module-report.json`
- `.tmp/post-ux-c-vendor-modules/post-ux-c-vendor-package-summary.csv`

## Dependencies

None. Do not run `npm install`.

## Decision gate

Only after this report should we decide whether there are large non-protected
libraries inside `vendor` that can safely be moved out while keeping
React/Router/lucide together.
