# POST-UX C — Iteration 03: Critical Render Dependency Reduction

## Evidence from Iteration 02

### Home
Pre mobile LCP median: ~4.366 s  
Post mobile LCP median: ~4.376 s  
Change: ~+0.2% (no improvement)

Pre desktop LCP median: ~1.289 s  
Post desktop LCP median: ~3.433 s  
Result: regression

Conclusion: forcing high/eager priority on the Home hero did not improve mobile
and correlated with a significant desktop regression. The Home hero priority
change is rolled back.

### Product Detail
Pre mobile LCP median: ~7.876 s  
Post mobile LCP median: ~3.524 s  
Improvement: ~55%

Pre desktop LCP median: ~2.287 s  
Post desktop LCP median: ~0.936 s

Conclusion: Product Detail prioritization + secondary-request deferral worked
and must be retained.

## New structural finding

Product Detail previously blocked the full page while either of these were loading:

- product request
- store configuration request

The component already defines a `currentStore` fallback, so store configuration
is not required to render the product itself.

That made the product image/LCP path depend on two independent requests.

## Iteration 03 changes

1. Revert Home hero forced `fetchPriority="high"` / eager / async attributes.
2. Keep Product Detail high-priority primary image.
3. Keep rating/similar-products idle deferral.
4. Change Product Detail loading gate from:
   `isStoreLoading || isProductLoading`
   to:
   `isProductLoading`

## Expected impact

- Restore Home desktop behavior toward pre-Iteration-02 baseline.
- Preserve Product Detail Iteration-02 gains.
- Reduce Product Detail LCP further by removing StoreConfig from the critical
  render dependency chain.

## No dependency changes

Do not run `npm install`.
