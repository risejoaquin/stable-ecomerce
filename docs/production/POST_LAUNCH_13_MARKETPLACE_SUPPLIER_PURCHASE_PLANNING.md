# POST-LAUNCH 13 — Marketplace Readiness, Supplier Operations & Purchase Planning

## Estado

Entrega preparada para validación en producción.

## Objetivo

Escalar Selfcare Sinners hacia una operación de catálogo y abastecimiento más robusta:

- gestión de proveedores;
- costos por proveedor;
- órdenes de compra;
- planeación de inventario;
- reposición sugerida;
- lead times;
- márgenes por producto/proveedor;
- catálogo por proveedor;
- alertas de stock proyectado;
- preparación para escalar catálogo y abastecimiento.

## Migración

Archivo:

```txt
scripts/db/019_post_launch_13_marketplace_supplier_purchase_planning.sql
```

Tablas agregadas:

```txt
suppliers
supplier_product_costs
supplier_catalog_items
purchase_orders
purchase_order_items
inventory_planning_snapshots
supplier_replenishment_suggestions
supplier_lead_time_logs
supplier_margin_snapshots
projected_stock_alerts
```

Columnas nuevas en `products`:

```txt
primary_supplier_id
supplier_sku
reorder_point
reorder_quantity
preferred_supplier_cost
lead_time_days
last_replenishment_reviewed_at
```

## API agregada

```txt
GET  /api/admin/supplier-ops/summary
GET  /api/admin/supplier-ops/suppliers
POST /api/admin/supplier-ops/suppliers
GET  /api/admin/supplier-ops/supplier-catalog
GET  /api/admin/supplier-ops/purchase-orders
POST /api/admin/supplier-ops/purchase-orders
GET  /api/admin/supplier-ops/inventory-planning
GET  /api/admin/supplier-ops/replenishment-suggestions
POST /api/admin/supplier-ops/replenishment-suggestions/run
GET  /api/admin/supplier-ops/lead-times
GET  /api/admin/supplier-ops/margins
GET  /api/admin/supplier-ops/stock-alerts
POST /api/admin/supplier-ops/stock-alerts/run
GET  /api/admin/supplier-ops/dashboard
```

Todas las rutas admin requieren token admin.

## Smoke test

Archivo:

```txt
scripts/qa/smoke-supplier-ops.ps1
```

Comando:

```powershell
Unblock-File .\scripts\qa\smoke-supplier-ops.ps1

.\scripts\qa\smoke-supplier-ops.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Resultado esperado

```txt
PASS Supplier ops summary -> 200
PASS Suppliers -> 200
PASS Supplier catalog -> 200
PASS Purchase orders -> 200
PASS Inventory planning -> 200
PASS Replenishment suggestions -> 200
PASS Lead times -> 200
PASS Margins -> 200
PASS Stock alerts -> 200
PASS Supplier dashboard -> 200
PASS Create supplier -> 200
PASS Create purchase order -> 200
PASS Run replenishment suggestions -> 200
PASS Run stock alerts -> 200
PASS Admin diagnostics -> 200
PASS supplier ops smoke checks
```

## Decisiones técnicas

- Se usa `suppliers` como entidad base de abastecimiento.
- `purchase_orders` y `purchase_order_items` separan encabezado y detalle.
- `supplier_product_costs` permite historial y costo preferido por proveedor.
- `inventory_planning_snapshots` registra cortes operativos para planeación.
- `supplier_replenishment_suggestions` permite generar recomendaciones sin modificar stock.
- `projected_stock_alerts` registra alertas proyectadas sin bloquear venta.
- La fase no abre rutas públicas nuevas; toda la superficie es admin.

## Riesgos

- Si una tabla anterior ya existe con contrato distinto, Supabase puede pedir columnas adicionales. En ese caso se corrige con Hotfix PL13.1.
- La fase agrega planeación y órdenes de compra base, no recepción contable avanzada ni integración directa con proveedores externos.
- Los costos pueden necesitar normalización posterior si el catálogo maneja centavos enteros y proveedores manejan decimales.
