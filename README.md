# Selfcare Sinners Ecommerce

## Estado actual

Proyecto ecommerce avanzado en producción sobre Railway, Supabase, Stripe y Resend.

### Macrofases recientes cerradas

- EMERGENCY-DRY-01 — Route/logout deduplication: PASS
- EMERGENCY-DRY-02 — Analytics dedupe centralization: PASS
- EMERGENCY-DRY-03 — Abandoned cart race-condition fix: PASS
- EMERGENCY-DRY-04 — CSS system collision cleanup: PASS
- EMERGENCY-DRY-05 — Account menu/types consolidation: PASS
- EMAIL PRODUCTION A — Safety/service consolidation: PASS
- EMAIL PRODUCTION B — Queue/webhooks/deliverability: PASS
- EMAIL PRODUCTION C — Admin Email Center/templates: PASS
- UIX SYSTEM A — Storefront/home architecture: PASS
- UIX SYSTEM B — Admin command center: PASS
- UIX SYSTEM C — Storefront/admin/profile consistency polish: PASS
- PERFORMANCE/FRONTEND D — Bundle optimization/route splitting: PASS

## Stack

- Frontend: Vite / React
- Backend: Node / Express
- DB: Supabase PostgreSQL
- Payments: Stripe
- Email: Resend
- Deploy: Railway

## Validación PERFORMANCE/FRONTEND D

```powershell
Unblock-File .\scripts\qa\smoke-performance-frontend-d.ps1
.\scripts\qa\smoke-performance-frontend-d.ps1
npm install
npm run build
```

## Deploy

```powershell
git add .
git commit -m "Performance Frontend D bundle route splitting"
git push origin main
```

## Pendientes restantes

- QA/RELEASE E — Final regression, accessibility and production closure.
- Security Dependencies — revisión controlada de `npm audit` sin aplicar `npm audit fix` a ciegas.


---

# QA/RELEASE E — Final Regression, Accessibility & Production Closure

Estado: preparado para validación final.

Incluye cierre de regresión, accesibilidad básica, responsive QA, producción, readiness final y reporte de estado del proyecto.

## Validación QA/RELEASE E

```powershell
Unblock-File .\scripts\qa\smoke-qa-release-e.ps1
.\scripts\qa\smoke-qa-release-e.ps1
npm install
npm run build
```

## Validación opcional contra producción

```powershell
.\scripts\qa\smoke-qa-release-e.ps1 `
  -BaseUrl "https://selfcaresinners.com"
```

## Estado del roadmap actual

- EMERGENCY-DRY-01: PASS
- EMERGENCY-DRY-02: PASS
- EMERGENCY-DRY-03: PASS
- EMERGENCY-DRY-04: PASS
- EMERGENCY-DRY-05: PASS
- EMAIL PRODUCTION A: PASS
- EMAIL PRODUCTION B: PASS
- EMAIL PRODUCTION C: PASS
- UIX SYSTEM A: PASS
- UIX SYSTEM B: PASS
- UIX SYSTEM C: PASS
- PERFORMANCE/FRONTEND D: PASS
- QA/RELEASE E: preparado para cierre

Resultado esperado: `PASS qa release e final regression accessibility production closure checks`.
