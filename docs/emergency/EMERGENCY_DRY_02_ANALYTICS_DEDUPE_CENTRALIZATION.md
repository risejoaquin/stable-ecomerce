# EMERGENCY-DRY-02 — Analytics dedupe centralization

## Objetivo

Eliminar duplicación de `trackMarketingEvent` y prevenir doble ejecución de eventos de analytics que inflen métricas de conversión.

## Problemas corregidos

- `trackMarketingEvent()` estaba duplicado en `App.tsx`, `HomePage.tsx`, `ProductDetailPage.tsx` y `EditorialProductCard.tsx`.
- Cada copia creaba sesión, hacía `fetch('/api/analytics/events')` y definía `source` por separado.
- No existía `event_id` ni `dedupe_key` frontend.
- `page_view` podía repetirse por rerender/navegación.

## Cambios aplicados

- Nuevo `src/lib/analytics.ts`.
- Fuente única: `trackMarketingEvent()`.
- Helper: `trackPageView()` con dedupe más largo.
- Sesión centralizada: `getMarketingSessionId()`.
- `event_id` y `dedupe_key` generados de forma estable por evento/sesión/source/metadata/path.
- Dedupe con `sessionStorage` para evitar doble click/eventos repetidos inmediatos.
- App/Home/Product/ProductCard ahora importan la función central.

## Archivos tocados

- `src/lib/analytics.ts`
- `src/App.tsx`
- `src/pages/store/HomePage.tsx`
- `src/pages/store/ProductDetailPage.tsx`
- `src/components/editorial/EditorialProductCard.tsx`
- `scripts/qa/smoke-emergency-dry-02.ps1`
- `docs/emergency/EMERGENCY_DRY_02_ANALYTICS_DEDUPE_CENTRALIZATION.md`
- `docs/roadmap/ROADMAP_MACROFASES_MASTER_RESTANTES.md`
- `README.md`
- `.gitignore`

## Resultado esperado

- Una sola implementación de `trackMarketingEvent`.
- Solo `src/lib/analytics.ts` ejecuta `fetch('/api/analytics/events')`.
- Eventos enviados con `event_id` y `dedupe_key`.
- `page_view` protegido contra duplicación.
- Build debe pasar sin tocar Stripe, Supabase ni backend crítico.
