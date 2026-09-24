# POST-LAUNCH 09 — Finance, Accounting, Reconciliation & Admin Reporting

## Objetivo

Cerrar la base operativa financiera del ecommerce con reportes de ventas, conciliación Stripe vs órdenes, cierre diario, inventario valorizado, márgenes, refunds y exportación CSV para administración contable básica.

## Alcance

- Reconciliación de órdenes pagadas contra `stripe_payment_intent_id` y eventos Stripe.
- Reportes de ventas por periodo y día.
- Cálculo base de AOV, ventas brutas e inventario valorizado.
- Reporte de márgenes/costos por producto.
- Reporte de refunds/devoluciones.
- Cierre diario operativo.
- Exportación CSV de órdenes.
- Smoke test `scripts/qa/smoke-finance.ps1`.

## Criterio de cierre

- Migración 015 aplicada.
- Tablas financieras visibles en Supabase.
- Endpoints `/api/admin/finance/*` en 200.
- Smoke finance en PASS.
- Diagnostics admin en estado limpio.
