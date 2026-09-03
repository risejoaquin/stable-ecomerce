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


## QA RELEASE E HOTFIX 01 — PowerShell production smoke variable fix

Corrige el smoke `scripts/qa/smoke-qa-release-e.ps1` para no usar `$home`, porque en PowerShell `HOME` es una variable reservada/constante en algunos entornos.

Cambio aplicado:

- `$home` -> `$homeResponse`

Validación esperada:

```powershell
Unblock-File .\scripts\qa\smoke-qa-release-e.ps1
.\scripts\qa\smoke-qa-release-e.ps1 -BaseUrl "https://selfcaresinners.com"
```

Resultado esperado adicional:

```txt
PASS production home responds
PASS qa release e final regression accessibility production closure checks
```


## QA RELEASE E HOTFIX 02 — Vite Vendor Circular Chunk

Corrige el blank screen de producción causado por la advertencia de Rollup/Vite:

```txt
Circular chunk: vendor -> vendor-react -> vendor
```

La corrección deja React, React DOM, React Router y lucide-react dentro del mismo chunk `vendor` para evitar inicialización circular entre chunks.

Validación:

```powershell
Unblock-File .\scripts\qa\smoke-qa-release-e.ps1
.\scripts\qa\smoke-qa-release-e.ps1 -BaseUrl "https://selfcaresinners.com"
npm run build
```

## QA/RELEASE E HOTFIX 03 — Service Worker Fetch Response Guard

Corrige el error de consola `TypeError: Failed to convert value to 'Response'` producido por el service worker al navegar rutas con query params como `/?search=Piel%20sensible`.

Archivos clave:

- `public/sw.js`
- `docs/release/QA_RELEASE_E_HOTFIX_03_SERVICE_WORKER_FETCH_RESPONSE_GUARD.md`
- `scripts/qa/smoke-qa-release-e.ps1`

Validación:

```powershell
Unblock-File .\scripts\qa\smoke-qa-release-e.ps1
.\scripts\qa\smoke-qa-release-e.ps1 -BaseUrl "https://selfcaresinners.com"
npm run build
```


## QA RELEASE E HOTFIX 04 — PowerShell Regex Literal Assert

Corrige el smoke final para que la validación del service worker use comparación literal en patrones con `||` y paréntesis. No cambia lógica de producción.

## QA RELEASE E HOTFIX 05 — Assert-ContainsLiteral Applied

Corrige definitivamente el smoke `scripts/qa/smoke-qa-release-e.ps1` para que la validación literal del fallback del service worker use `Assert-ContainsLiteral` y no `Assert-Contains`/`-match`.

## LOGIN UIX A — Premium Auth Modal

Actualiza el diseño frontend del login/registro/recuperación para alinearlo al sistema visual premium de Selfcare Sinners.

### Archivos principales
- `src/components/AuthMock.tsx`
- `src/styles/uix-soft-premium-system.css`
- `docs/design/LOGIN_UIX_A_PREMIUM_AUTH_MODAL.md`
- `scripts/qa/smoke-login-uix-a.ps1`

### Validación
```powershell
Unblock-File .\scripts\qa\smoke-login-uix-a.ps1
.\scripts\qa\smoke-login-uix-a.ps1
npm run build
```

## LOGIN UIX A HOTFIX 01 — Dialog Role Smoke Assert

Corrige el smoke test del login premium para validar `role="dialog"` con búsqueda literal estable. No cambia lógica de autenticación ni backend.


## LOGIN UIX A HOTFIX 02 — PowerShell Quote Literal Assert

Corrige el smoke `scripts/qa/smoke-login-uix-a.ps1` para validar atributos TSX como `role="dialog"` usando literales PowerShell con comillas simples. No cambia lógica de producción.
