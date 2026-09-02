# Selfcare Sinners — MACROFASE FINAL A / PL30 + PL31 + PL32

Entrega: Experimentation Platform, Real Integrations Layer, Financial Forecasting, Inventory Demand Planning & Unit Economics.

## Validación rápida

1. Ejecutar `scripts/db/036_macro_final_a_pl30_pl31_pl32_experimentation_integrations_forecasting.sql` en Supabase.
2. Ejecutar `NOTIFY pgrst, 'reload schema';`.
3. Desplegar en Railway.
4. Ejecutar `scripts/qa/smoke-macro-final-a.ps1`.

# Selfcare Sinners — POST-LAUNCH 26

Entrega: **Live Operations Monitoring, Conversion Optimization & Growth Iteration Loop**.

Incluye:

- `scripts/db/032_post_launch_26_live_operations_conversion_growth_iteration_loop.sql`
- `scripts/qa/smoke-live-growth-loop.ps1`
- `docs/production/POST_LAUNCH_26_LIVE_OPERATIONS_CONVERSION_GROWTH_ITERATION_LOOP.md`
- `src/components/LiveGrowthLoopPanel.tsx`

Estado objetivo: operación real post-campaña, ventas reales, comportamiento por canal, optimización de conversión, A/B prioritization, bottlenecks, campaign iteration, risk/cost control y continuous improvement loop.

---

# Selfcare Sinners — POST-LAUNCH 22

## Real User Testing, Conversion QA & Live Behavior Feedback Loop

Este ZIP incluye PL22 sobre la base cerrada hasta PL21. Agrega contratos de base de datos, endpoints admin, smoke test y documentación para probar usuarios reales, detectar fricción, medir conversión, analizar abandono, capturar feedback, validar mobile/checkout real y priorizar mejoras por impacto.

### Migración

` scripts/db/028_post_launch_22_real_user_testing_conversion_qa_feedback_loop.sql `

### Smoke

` scripts/qa/smoke-real-user-testing.ps1 `

### Resultado esperado

`PASS real user testing smoke checks`

---

# Selfcare Sinners Ecommerce

## Estado actual

Roadmap ejecutado y validado hasta:

- POST-LAUNCH 16 — Marketplace Expansion, Multi-Channel Sales & External Integrations: PASS
- POST-LAUNCH 17 — Advanced Automation, CRM & Lifecycle Marketing: preparado para validación

## Stack

- Frontend: Vite / React
- Backend: Node / Express
- DB: Supabase PostgreSQL
- Payments: Stripe
- Email: Resend
- Deploy: Railway

## PL17

Incluye CRM avanzado, automatizaciones por comportamiento, journeys, campañas por segmento, recuperación de carrito avanzada, post-compra, recompra y orquestación email/push base.

### Migración

```sql
scripts/db/023_post_launch_17_advanced_automation_crm_lifecycle_marketing.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke

```powershell
.\scripts\qa\smoke-crm-lifecycle.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```


## POST-LAUNCH 18 — Enterprise Security, Audit Trails & Compliance Hardening

Incluye auditoría avanzada, trazabilidad admin, revisión periódica de permisos, retención de datos, exportaciones auditables, controles anti-abuso, aprobaciones para acciones sensibles y hardening final de seguridad.

### Migración

```sql
scripts/db/024_post_launch_18_enterprise_security_audit_compliance_hardening.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke

```powershell
.\scripts\qa\smoke-enterprise-security.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## POST-LAUNCH 19 — Performance, Load Testing & Cost Optimization

Incluye migración y smoke para:

- pruebas de carga controladas
- query profiling
- slow query reports
- cache metrics
- cost snapshots
- resource usage alerts
- admin endpoint optimization checks
- Railway/Supabase optimization readiness

### Migración

```sql
scripts/db/025_post_launch_19_performance_load_cost_optimization.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke

```powershell
Unblock-File .\scripts\qa\smoke-performance-cost.ps1

.\scripts\qa\smoke-performance-cost.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```


## POST-LAUNCH 20 — Final Commercial Scale Report & Strategic Roadmap

Incluye reporte ejecutivo final, assessment técnico/comercial, matriz de riesgos, deuda técnica, costos operativos, capacidad de escala, roadmap estratégico 2.0, decisión de escala e investor readiness.

Validación:

```powershell
.\scripts\qa\smoke-final-scale-report.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```


## POST-LAUNCH 21 — Full UX/UI Customer Journey Completion & Frontend Product Polish

PL21 agrega auditoría operativa UX/UI para customer journey, admin UX, mobile-first, checkout confidence, accesibilidad, conversión/confianza y visual regression baseline.

Validación: `scripts/qa/smoke-ux-ui-journey.ps1`.
Migración: `scripts/db/027_post_launch_21_ux_ui_customer_journey_frontend_polish.sql`.

---

# POST-LAUNCH 23 — Visual Brand System, Design System & Content Finalization

## Objetivo

Cerrar identidad visual final, consolidar design system, normalizar componentes, terminar contenido comercial, mejorar consistencia visual, estandarizar banners/cards/botones/formularios, cerrar tono/microcopy, preparar assets definitivos para campañas y dejar la tienda lista para marca seria.

## Archivos agregados

- `scripts/db/029_post_launch_23_visual_brand_system_design_system_content_finalization.sql`
- `scripts/qa/smoke-brand-system.ps1`
- `docs/production/POST_LAUNCH_23_VISUAL_BRAND_SYSTEM_DESIGN_SYSTEM_CONTENT_FINALIZATION.md`
- `src/components/BrandSystemPanel.tsx`

## Validación rápida

```powershell
Unblock-File .\scripts\qa\smoke-brand-system.ps1
.\scripts\qa\smoke-brand-system.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Resultado esperado: `PASS brand system smoke checks`.

## POST-LAUNCH 24 — Production Content Completion, SEO Content Depth & Campaign Landing Pages

Estado: listo para aplicar y validar.

Incluye:

- `scripts/db/030_post_launch_24_production_content_seo_campaign_landing_pages.sql`
- `scripts/qa/smoke-content-seo.ps1`
- `docs/production/POST_LAUNCH_24_PRODUCTION_CONTENT_SEO_CAMPAIGN_LANDING_PAGES.md`
- `src/components/ContentSeoPanel.tsx`

Objetivo:

- Completar contenido final de producción.
- Crear landing pages comerciales.
- Reforzar SEO de contenido.
- Optimizar páginas por intención de búsqueda.
- Preparar páginas para campañas.
- Cerrar textos finales de producto/categoría.
- Mejorar contenido educativo.
- Preparar tráfico orgánico y pagado.


## HOTFIX 24.1 — Campaign Landing Pages Schema Cache

Si el smoke falla en `/api/admin/content-seo/landing-pages/run` con:

```txt
Could not find the 'campaign_type' column of 'campaign_landing_pages' in the schema cache
```

Ejecuta en Supabase:

```txt
scripts/db/030b_post_launch_24_campaign_landing_pages_schema_cache_hotfix.sql
```

Luego espera unos segundos y repite:

```powershell
.\scripts\qa\smoke-content-seo.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```


## POST-LAUNCH 24 HOTFIX 24.2

Corrige compatibilidad con la tabla heredada `campaign_landing_pages` creada en PL06, donde `title` es `NOT NULL`. PL24 usa `headline` y `value_proposition`; este hotfix agrega default/trigger de normalización y además actualiza el payload del endpoint para enviar `title`, `subtitle` y `content`.

Ejecutar en Supabase:

```sql
scripts/db/030c_post_launch_24_campaign_landing_pages_title_not_null_hotfix.sql
```

Luego repetir:

```powershell
.\scripts\qa\smoke-content-seo.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```


## POST-LAUNCH 25 — Controlled Marketing Launch, Paid Traffic Activation & Revenue Validation

Incluye migración `scripts/db/031_post_launch_25_controlled_marketing_launch_paid_traffic_revenue_validation.sql`, smoke `scripts/qa/smoke-marketing-launch.ps1`, endpoints `/api/admin/marketing-launch/*` y documentación de producción.


## POST-LAUNCH 27 — Customer Success, Retention Operations & Post-Purchase Experience

Estado entregable: listo para validación.

Incluye:
- Migración: `scripts/db/033_post_launch_27_customer_success_retention_post_purchase_experience.sql`
- Smoke: `scripts/qa/smoke-customer-success.ps1`
- Doc: `docs/production/POST_LAUNCH_27_CUSTOMER_SUCCESS_RETENTION_POST_PURCHASE_EXPERIENCE.md`
- UI component: `src/components/CustomerSuccessPanel.tsx`

Objetivo: experiencia post-compra, satisfacción, soporte, recompra, retención, emails post-compra, quejas/devoluciones, NPS/CSAT y clientes recurrentes.

## POST-LAUNCH 28 — Executive Operating System, KPI Command Center & Business Intelligence

Adds executive KPI snapshots, business command center, commercial/technical health checks, full funnel analytics, channel/campaign comparisons, decision priorities, investor reporting packets, BI insights and operating system reviews.

Smoke test: `scripts/qa/smoke-executive-bi.ps1`.


## POST-LAUNCH 29 — Operational Automation, Scheduled Reports & Alerting Workflows

Estado del entregable: generado para validación.

Incluye migración `scripts/db/035_post_launch_29_operational_automation_scheduled_reports_alerting_workflows.sql`, smoke `scripts/qa/smoke-operational-automation.ps1`, endpoints `/api/admin/operational-automation/*` y documentación de producción.

Objetivo: automatizar reportes recurrentes, revisiones diarias/semanales, alertas comerciales/técnicas, anomalías, riesgos de revenue/conversión, seguimiento de campañas, soporte/retención y workflow ejecutivo recurrente.


## MACROFASE FINAL B — PL33 + PL34 + PL35

Incluye internacionalización, multi-moneda, readiness fiscal/legal, personalización avanzada, recommendation engine, customer data platform, scale governance freeze, maintenance mode y product v2 roadmap.

### Migración

Ejecutar en Supabase:

```sql
scripts/db/037_macro_final_b_pl33_pl34_pl35_internationalization_personalization_governance.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke

```powershell
Unblock-File .\scripts\qa\smoke-macro-final-b.ps1
.\scripts\qa\smoke-macro-final-b.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

---

# UIX-01 — Premium Storefront UX Strategy & Benchmark Plan

Este ZIP agrega la fase de planeación de rediseño UI/UX antes de tocar código visual fuerte.

Documentos incluidos:

- `docs/design/UIX01_UX_STRATEGY.md`
- `docs/design/BENCHMARK_REFERENCES.md`
- `docs/design/INDUSTRY_UX_STANDARDS.md`
- `docs/design/CUSTOMER_JOURNEY_MAP.md`
- `docs/design/STOREFRONT_INFORMATION_ARCHITECTURE.md`
- `docs/design/DESIGN_SYSTEM_DIRECTION.md`
- `docs/design/COMPONENT_REDESIGN_MAP.md`
- `docs/design/IMPLEMENTATION_ROADMAP_UI.md`
- `docs/design/UIX01_README.md`

Siguiente paso después de aprobar este plan:

- `MACRO UI A — Premium Storefront Redesign`
- `MACRO UI B — Checkout & Conversion Experience Redesign`

## MACRO UI C — Final Visual QA, Storefront Integration & Conversion Polish

Esta entrega integra el rediseño visual premium con una capa final de QA visual, consistencia, mobile-first y polish de conversión.

Archivos principales:

- `src/styles/final-visual-polish.css`
- `src/components/visual/FinalVisualQAPanel.tsx`
- `docs/design/MACRO_UI_C_FINAL_VISUAL_QA.md`
- `docs/design/UI_C_SCREEN_CHECKLIST.md`
- `docs/design/UI_C_MOBILE_CHECKLIST.md`
- `docs/design/UI_C_CONVERSION_POLISH.md`
- `docs/design/UI_C_FINAL_DESIGN_SYSTEM_FREEZE.md`
- `scripts/qa/smoke-ui-c-visual-checklist.ps1`

Validación:

```powershell
Unblock-File .\scripts\qa\smoke-ui-c-visual-checklist.ps1
.\scripts\qa\smoke-ui-c-visual-checklist.ps1
npm install
npm run build
npm run dev
```
