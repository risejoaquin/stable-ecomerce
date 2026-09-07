# POST-LAUNCH 23 — Visual Brand System, Design System & Content Finalization

## Estado

Pendiente de validación por smoke test.

## Objetivo

Cerrar identidad visual final, consolidar design system, normalizar componentes, terminar contenido comercial, mejorar consistencia visual, estandarizar banners/cards/botones/formularios, cerrar tono/microcopy, preparar assets definitivos para campañas y dejar la tienda lista como marca seria.

## Alcance

- Identidad visual final.
- Design system operativo.
- Componentes reutilizables normalizados.
- Contenido comercial listo para tráfico.
- Consistencia visual storefront/admin.
- Assets definitivos para campañas.
- Microcopy de compra, confianza y estados vacíos.
- Estándares UI para banners, cards, botones y formularios.
- Cierre de contenido de producto.
- Reporte de readiness de marca.

## Tablas

- `visual_brand_systems`
- `design_system_tokens`
- `reusable_component_standards`
- `commercial_content_items`
- `visual_consistency_checks`
- `campaign_asset_readiness`
- `brand_microcopy_items`
- `banner_card_button_form_standards`
- `product_content_completion_items`
- `brand_readiness_reports`

## Endpoints

- `GET /api/admin/brand-system/summary`
- `GET /api/admin/brand-system/identity`
- `POST /api/admin/brand-system/identity/run`
- `GET /api/admin/brand-system/design-system`
- `POST /api/admin/brand-system/design-system/run`
- `GET /api/admin/brand-system/components`
- `POST /api/admin/brand-system/components/run`
- `GET /api/admin/brand-system/content`
- `POST /api/admin/brand-system/content/run`
- `GET /api/admin/brand-system/visual-consistency`
- `POST /api/admin/brand-system/visual-consistency/run`
- `GET /api/admin/brand-system/campaign-assets`
- `POST /api/admin/brand-system/campaign-assets/run`
- `GET /api/admin/brand-system/microcopy`
- `POST /api/admin/brand-system/microcopy/run`
- `GET /api/admin/brand-system/ui-standards`
- `POST /api/admin/brand-system/ui-standards/run`
- `GET /api/admin/brand-system/product-content`
- `POST /api/admin/brand-system/product-content/run`
- `GET /api/admin/brand-system/brand-readiness`
- `POST /api/admin/brand-system/brand-readiness/run`

## Validación

Ejecutar migración:

```sql
scripts/db/029_post_launch_23_visual_brand_system_design_system_content_finalization.sql
NOTIFY pgrst, 'reload schema';
```

Validar tablas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'visual_brand_systems',
    'design_system_tokens',
    'reusable_component_standards',
    'commercial_content_items',
    'visual_consistency_checks',
    'campaign_asset_readiness',
    'brand_microcopy_items',
    'banner_card_button_form_standards',
    'product_content_completion_items',
    'brand_readiness_reports'
  )
ORDER BY table_name;
```

Ejecutar smoke:

```powershell
Unblock-File .\scripts\qa\smoke-brand-system.ps1

.\scripts\qa\smoke-brand-system.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Resultado esperado

```txt
PASS Brand system summary -> 200
PASS Brand identity -> 200
PASS Run brand identity -> 200
PASS Design system -> 200
PASS Run design system -> 200
PASS Component standards -> 200
PASS Run component standards -> 200
PASS Commercial content -> 200
PASS Run commercial content -> 200
PASS Visual consistency -> 200
PASS Run visual consistency -> 200
PASS Campaign assets -> 200
PASS Run campaign assets -> 200
PASS Microcopy -> 200
PASS Run microcopy -> 200
PASS UI standards -> 200
PASS Run UI standards -> 200
PASS Product content -> 200
PASS Run product content -> 200
PASS Brand readiness -> 200
PASS Run brand readiness -> 200
PASS Admin diagnostics -> 200
PASS brand system smoke checks
```

## Decisión técnica

PL23 no introduce una nueva capa transaccional pesada. Consolida el nivel de producto visual y comercial para que la tienda tenga consistencia de marca, diseño, contenido, componentes y assets antes de campañas o tráfico serio.
