# POST-LAUNCH 06 — Paid Traffic Readiness & Conversion Hardening

## Objetivo
Preparar Selfcare Sinners para tráfico pagado con landing pages por campaña, product feed, eventos ads/CAPI, UTM enforcement, A/B testing base, trust badges y dashboard de paid traffic.

## Alcance
- Landing pública por campaña: `/api/public/campaigns/:slug/landing`.
- Product feed público: `/api/public/product-feed`.
- Captura server-side de eventos ads: `/api/ads/events`.
- Asignación de experimentos: `/api/experiments/assign`.
- Admin paid traffic summary/campaigns/feed/experiments/conversion-api.
- Smoke test: `scripts/qa/smoke-paid-traffic.ps1`.
- Migración: `scripts/db/012_post_launch_06_paid_traffic_conversion_hardening.sql`.

## Criterio PASS
- Migración 012 aplicada.
- Tablas paid traffic creadas.
- Smoke paid traffic PASS.
- Product feed responde 200.
- Landing de campaña responde 200.
- Ads events capturan 200/202 sin romper storefront.
- Admin endpoints paid traffic responden 200 con token.

## Validación
```powershell
.\scripts\qa\smoke-paid-traffic.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```
