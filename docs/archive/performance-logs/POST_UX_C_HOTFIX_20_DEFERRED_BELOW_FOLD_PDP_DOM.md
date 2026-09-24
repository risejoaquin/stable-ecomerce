# POST-UX C HOTFIX 20 — Deferred below-fold PDP DOM

## Evidence

Representative 10-run baseline median: ~2706 ms.

Run 8 forensic:
- TTFB: ~103 ms
- resource load delay: ~19 ms
- resource load duration: ~116 ms
- element render delay: ~139 ms
- Style & Layout: ~319 ms
- Script Evaluation: ~263 ms
- forced reflow: none
- network critical chain: ~259 ms with 0 LCP savings
- render-blocking CSS: 0 LCP savings

The PDP already has `secondaryContentReady` driven by `requestIdleCallback`, but
reviews and footer were still mounted during the first render.

## Change

Gate only below-the-fold content behind the existing `secondaryContentReady`:
- similar products
- reviews section
- EditorialFooter

Keep immediate:
- LCP image/gallery
- buy panel
- product title/price/CTA
- variants
- trust/accordion content
- MobileEditorialNav
- CartDrawer

## Safety

No dependency changes.
No Vite/manualChunks changes.
No server/API/CSP/SEO/image pipeline changes.
No package installation required.

## Goal

Reduce initial React reconciliation + Style/Layout before the LCP paint without
altering the first viewport or the proven stable vendor graph.
