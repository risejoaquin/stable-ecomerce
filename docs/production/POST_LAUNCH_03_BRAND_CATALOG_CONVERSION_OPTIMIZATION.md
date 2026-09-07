# POST-LAUNCH 03 — Brand, Catalog & Conversion Optimization

## Estado objetivo
Preparar Selfcare Sinners para operación comercial con catálogo real, categorías comerciales, campañas, medición de funnel y readiness para tráfico pagado.

## Cambios incluidos

- API pública de home comercial: `/api/public/home`.
- API pública de categorías: `/api/public/categories`.
- Captura de eventos de conversión: `/api/analytics/events`.
- Diagnóstico admin de funnel: `/api/admin/conversion/summary`.
- Template CSV para carga masiva: `/api/admin/catalog/export-template`.
- Endpoint JSON de carga masiva controlada: `/api/admin/catalog/bulk-upsert`.
- Migración `009_post_launch_03_brand_catalog_conversion_optimization.sql`.
- Smoke test `scripts/qa/smoke-growth.ps1`.

## Eventos medidos

- `page_view`
- `product_view`
- `add_to_cart`
- `cart_open`
- `checkout_started`
- `coupon_applied`
- `wishlist_add`
- `campaign_click`
- `search`

## Criterios de cierre

- Migración 009 aplicada.
- `/api/public/home` responde 200.
- `/api/public/categories` responde 200.
- `/api/admin/conversion/summary` responde 200.
- Smoke growth PASS.
- Eventos reales aparecen en `marketing_events` después de navegar/agregar al carrito/iniciar checkout.
- No hay errores nuevos en `/api/admin/diagnostics`.

## Riesgos y decisiones

- La captura de analytics es no bloqueante: si falla, devuelve 202 o falla silenciosamente en frontend para no romper compra.
- La carga masiva JSON está limitada a 100 productos por request.
- El template CSV es preparación operativa; el import final CSV puede implementarse como siguiente paso si se requiere upload directo.
