# Selfcare Sinners Ecommerce

Estado: producción activa hasta POST-LAUNCH 15 PASS. Esta entrega incluye:

1. HOTFIX / CONSOLIDACIÓN — PL14.1 + PL15 Baseline Cleanup
2. POST-LAUNCH 16 — Marketplace Expansion, Multi-Channel Sales & External Integrations

## Aplicación recomendada

```powershell
cd C:\Users\Joaquin\OneDrive\Documentos\Stable-Ecomerce\stable-ecomerce

git add .
git commit -m "PL14.1 consolidation and PL16 multichannel marketplace readiness"
git push origin main
```

## Migraciones

Ejecutar en Supabase, en orden:

```sql
scripts/db/020b_post_launch_14_1_mobile_pwa_schema_contract_consolidation.sql
scripts/db/022_post_launch_16_marketplace_multichannel_external_integrations.sql
NOTIFY pgrst, 'reload schema';
```

## Smoke tests

```powershell
Unblock-File .\scripts\qa\smoke-mobile-pwa.ps1
Unblock-File .\scripts\qa\smoke-ai-commerce.ps1
Unblock-File .\scripts\qa\smoke-channels.ps1

.\scripts\qa\smoke-mobile-pwa.ps1 -BaseUrl "https://selfcaresinners.com" -Email "TU_ADMIN_EMAIL" -Password "TU_PASSWORD"
.\scripts\qa\smoke-ai-commerce.ps1 -BaseUrl "https://selfcaresinners.com" -Email "TU_ADMIN_EMAIL" -Password "TU_PASSWORD"
.\scripts\qa\smoke-channels.ps1 -BaseUrl "https://selfcaresinners.com" -Email "TU_ADMIN_EMAIL" -Password "TU_PASSWORD"
```

## Resultado esperado

- `PASS mobile PWA smoke checks`
- `PASS AI commerce smoke checks`
- `PASS channels smoke checks`
