# POST-LAUNCH 14.1 — Mobile PWA Schema Contract Consolidation Hotfix

## Estado
CLOSED cuando `smoke-mobile-pwa.ps1` responde PASS completo.

## Objetivo
Integrar en el repositorio la verdad de producción aplicada manualmente durante PL14.

## Cambios consolidados
- `categories` compatibility table para `/api/mobile/offline-catalog`.
- Contrato completo de `mobile_install_events`.
- Contrato completo de `mobile_checkout_events`.
- Contrato completo de `web_push_subscriptions`.
- Índices `UNIQUE` para UPSERT de push subscriptions.
- Contrato completo de `mobile_app_readiness_checks`.
- Índices `UNIQUE` para UPSERT de app readiness.
- Trigger `trg_normalize_mobile_app_readiness_checks` para evitar inserts incompletos.

## Validación
Ejecutar:

```powershell
.\scripts\qa\smoke-mobile-pwa.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Esperado:

```txt
PASS mobile PWA smoke checks
```
