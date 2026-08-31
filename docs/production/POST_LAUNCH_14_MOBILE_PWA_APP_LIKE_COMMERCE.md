# POST-LAUNCH 14 — Mobile Experience, PWA Hardening & App-Like Commerce

## Objetivo

Fortalecer la experiencia móvil y PWA de Selfcare Sinners para operar como comercio app-like sin comprometer seguridad ni la capa actual de producción.

## Alcance

- Experiencia móvil avanzada.
- PWA installable más robusta.
- Offline-lite para catálogo.
- Mejor checkout móvil.
- Notificaciones web push base.
- Home screen app experience.
- Optimización táctil.
- Performance mobile.
- Retención desde móvil.
- Preparación para app futura.

## Componentes

### Base de datos

- `mobile_pwa_sessions`
- `mobile_install_events`
- `mobile_offline_catalog_snapshots`
- `mobile_checkout_events`
- `web_push_subscriptions`
- `mobile_touch_optimization_events`
- `mobile_performance_snapshots`
- `mobile_retention_events`
- `mobile_app_readiness_checks`

### API pública/controlada

- `GET /api/mobile/offline-catalog`
- `POST /api/mobile/install-event`
- `POST /api/mobile/checkout-event`
- `POST /api/mobile/push-subscription`

### API admin

- `GET /api/admin/mobile-pwa/summary`
- `GET /api/admin/mobile-pwa/checkout-readiness`
- `GET /api/admin/mobile-pwa/web-push`
- `GET /api/admin/mobile-pwa/touch-optimization`
- `GET /api/admin/mobile-pwa/performance`
- `GET /api/admin/mobile-pwa/retention`
- `GET /api/admin/mobile-pwa/app-readiness`
- `POST /api/admin/mobile-pwa/app-readiness/run`

## Seguridad

Los endpoints públicos solo registran eventos de bajo riesgo o devuelven catálogo offline-lite. Los endpoints de observabilidad operativa usan autenticación admin.

## Validación

Ejecutar:

```powershell
.\scripts\qa\smoke-mobile-pwa.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Resultado esperado:

```txt
PASS mobile PWA smoke checks
```
