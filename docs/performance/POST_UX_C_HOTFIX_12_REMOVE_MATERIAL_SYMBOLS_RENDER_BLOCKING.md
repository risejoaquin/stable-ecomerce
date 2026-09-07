# POST-UX C HOTFIX 12 — Remove Material Symbols render-blocking font

## Diagnosis

After HOTFIX 10 and HOTFIX 11, the LCP image is already optimized and discovered quickly after product data:

- Product API median start: ~384 ms
- Product API median duration: ~172 ms
- API → image gap: ~19 ms
- Image median duration: ~130 ms
- Image transfer: ~35 KB
- Median LCP remains ~3728 ms

Lighthouse confirms the LCP element is the PDP main product image and that it already uses:

- `fetchpriority="high"`
- `loading="eager"`
- `decoding="async"`

The remaining actionable Lighthouse signal is render blocking. It reports Google Fonts, Material Symbols and the main CSS as blocking resources, with an estimated savings of ~710 ms.

## Scope

This hotfix removes only the unnecessary global Material Symbols font from the critical path.

## Changes

- Remove global Material Symbols `@import` from `src/index.css`.
- Replace cart drawer Material Symbols usages with existing `lucide-react` icons:
  - `shopping_bag` → `ShoppingBag`
  - `delete` → `Trash2`
- Preserve HOTFIX 10 responsive image pipeline.
- Preserve HOTFIX 11 early PDP product fetch.
- Preserve Vite/vendor/manualChunks behavior.
- Preserve service worker behavior.
- No dependency changes.

## Validation

```powershell
.\scripts\qa\apply-post-ux-c-hotfix-12.ps1
.\scripts\qa\smoke-post-ux-c-hotfix-12.ps1
npm run build

.\scripts\qa\smoke-post-ux-c-hotfix-11.ps1
.\scripts\qa\smoke-post-ux-c-hotfix-10.ps1
.\scripts\qa\smoke-post-ux-b.ps1
.\scripts\qa\smoke-post-ux-c-iteration-12.ps1
.\scripts\qa\smoke-mobile-ux-f.ps1
```

## GitHub release instructions

After local validation and before production deploy:

```powershell
git status
git diff --stat
git diff --check

git add -- `
  src/index.css `
  src/App.tsx `
  scripts/qa/apply-post-ux-c-hotfix-12.ps1 `
  scripts/qa/patch-post-ux-c-hotfix-12.mjs `
  scripts/qa/smoke-post-ux-c-hotfix-12.ps1 `
  docs/performance/POST_UX_C_HOTFIX_12_REMOVE_MATERIAL_SYMBOLS_RENDER_BLOCKING.md

git diff --cached --stat
git diff --cached --check

git commit -m "Remove Material Symbols render blocking font"
git pull --rebase origin main
git push origin main
```

After Railway deploy:

```powershell
.\scripts\qa\smoke-qa-release-e.ps1 `
  -BaseUrl "https://selfcaresinners.com"

$productPath = "/product/a4722406-d411-48ef-ba68-d73f5f6d9657/crema-facial-hidratante-regeneradora"

.\scripts\qa\measure-post-ux-c-local.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Paths $productPath `
  -Strategy mobile `
  -Runs 5
```
