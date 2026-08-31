# POST-LAUNCH 02 — Commercial Operations & Growth Readiness

## Objetivo

Convertir la tienda técnicamente estable en una operación comercial preparada para tráfico real: catálogo completo, categorías reales, stock confiable, campañas, reviews, políticas públicas, emails transaccionales y panel comercial admin.

## Alcance incluido

- Campos comerciales adicionales por producto: precio comparativo, costo, proveedor, threshold de bajo stock, estado comercial y alt text.
- Moderación de reviews: pending, approved, rejected.
- Tabla `commercial_campaigns` para campañas/cupones/lanzamientos.
- Tabla `email_events` para trazabilidad futura de emails transaccionales.
- Endpoints admin:
  - `GET /api/admin/commercial/summary`
  - `GET /api/admin/product-readiness`
  - `GET /api/admin/campaigns`
  - `POST /api/admin/campaigns`
  - `PUT /api/admin/campaigns/:id`
  - `GET /api/admin/reviews`
  - `PUT /api/admin/reviews/:id/moderation`
- Endpoint público:
  - `GET /api/public/policies`
- Panel admin nuevo:
  - `/admin/commercial`

## Criterio de cierre

- Migración 008 aplicada.
- Smoke comercial PASS.
- Panel `/admin/commercial` carga con 200.
- `commercial/summary`, `product-readiness`, `campaigns`, `reviews` responden 200.
- No hay errores nuevos en `diagnostics`.

## Decisión técnica

Se mantiene la base de checkout/Stripe/inventario ya validada. Esta fase agrega capa comercial y de growth sin tocar el contrato financiero crítico.
