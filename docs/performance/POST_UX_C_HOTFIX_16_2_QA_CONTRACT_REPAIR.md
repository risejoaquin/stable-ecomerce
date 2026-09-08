# POST-UX C HOTFIX 16.2 — QA contract repair

HOTFIX 16 intentionally supersedes two internal implementation details:
- HOTFIX 15 used `.select('images')`; HOTFIX 16 uses `.select('*')` to bootstrap the full product while preserving the same server-side LCP preload.
- HOTFIX 15.1 cached `productId -> imageUrl`; HOTFIX 16 caches the full product object with the same 5-minute TTL, which subsumes the original cache intent.

The old smokes failed because they asserted literal implementation details instead of the preserved behavioral contract.

HOTFIX 16.2 changes QA only:
- HOTFIX 15 accepts either images-only lookup or the full-product successor;
- HOTFIX 15.1 accepts either the legacy image cache or HOTFIX 16 full-product cache.

No production behavior changes.
