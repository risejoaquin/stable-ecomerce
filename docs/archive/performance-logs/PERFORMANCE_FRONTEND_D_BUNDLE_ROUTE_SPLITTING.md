# PERFORMANCE/FRONTEND D — Bundle Optimization & Route Splitting

## Objetivo

Reducir el costo del bundle inicial separando rutas pesadas del storefront, panel de administración y Email Center.

## Cambios aplicados

- Se agregó `src/routes/lazy-routes.tsx` como registro único de rutas lazy.
- `src/App.tsx` ahora usa `React.Suspense` y carga rutas bajo demanda.
- Las páginas admin se cargan solo al entrar a `/admin/*`.
- Email Center se carga solo al entrar a `/admin/email`.
- Storefront/customer routes se separan por ruta.
- `vite.config.ts` agrega `manualChunks` para vendor, React, Query, charts, icons, commerce, admin y storefront.
- Se agregó fallback visual UIX para carga de rutas.

## No toca

- Stripe
- Supabase
- Webhooks
- Email queue
- Auth server-side
- Contratos de base de datos

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-performance-frontend-d.ps1
.\scripts\qa\smoke-performance-frontend-d.ps1
npm install
npm run build
```

## Resultado esperado

- Smoke PASS.
- Build PASS.
- Generación de chunks separados para vendor/admin/storefront cuando Vite aplique el splitting.
- Menor costo de JavaScript inicial para usuarios que no entran al admin.
