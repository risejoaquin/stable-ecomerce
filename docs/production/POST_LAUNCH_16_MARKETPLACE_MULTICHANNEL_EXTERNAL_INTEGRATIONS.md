# POST-LAUNCH 16 — Marketplace Expansion, Multi-Channel Sales & External Integrations

## Objetivo
Preparar Selfcare Sinners para vender fuera del sitio principal mediante canales externos, feeds de catálogo, sincronización de inventario, órdenes externas y reportes por canal.

## Entregables
- `sales_channels`
- `channel_product_feeds`
- `channel_inventory_snapshots`
- `external_orders`
- `external_order_items`
- `channel_sync_events`
- `channel_pricing_rules`
- `channel_performance_snapshots`

## Endpoints
- `GET /api/admin/channels/summary`
- `GET /api/admin/channels`
- `POST /api/admin/channels`
- `GET /api/admin/channels/product-feeds`
- `POST /api/admin/channels/product-feeds/run`
- `GET /api/admin/channels/inventory-sync`
- `POST /api/admin/channels/inventory-sync/run`
- `GET /api/admin/channels/external-orders`
- `GET /api/admin/channels/performance`

## Decisiones técnicas
- No conecta marketplaces reales todavía.
- Deja la capa de datos y operaciones lista para Meta, Google, TikTok y marketplaces custom.
- Los feeds generados son snapshots internos exportables.
- Inventory sync crea snapshots por canal/producto para preparación multicanal.
- External orders queda preparado para importaciones futuras.

## Validación
Ejecutar migración:

```sql
scripts/db/022_post_launch_16_marketplace_multichannel_external_integrations.sql
NOTIFY pgrst, 'reload schema';
```

Luego smoke:

```powershell
.\scripts\qa\smoke-channels.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Esperado:

```txt
PASS channels smoke checks
```
