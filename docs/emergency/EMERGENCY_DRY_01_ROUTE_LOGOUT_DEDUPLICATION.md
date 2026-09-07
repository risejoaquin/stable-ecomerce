# EMERGENCY-DRY-01 — Route Collision Removal + Centralized Logout

## Objetivo

Corregir los dos riesgos inmediatos de duplicación detectados en la auditoría de emergencia:

1. Ruta backend duplicada `POST /api/admin/catalog/validate-import`.
2. Lógica de logout duplicada en múltiples componentes frontend.

## Cambios aplicados

### 1. Ruta duplicada eliminada

Se conserva un único handler canónico para:

```txt
POST /api/admin/catalog/validate-import
```

La segunda definición fue retirada para evitar colisión de rutas, código muerto y mantenimiento divergente.

### 2. Logout centralizado

Se agregó:

```txt
src/lib/auth-session.ts
```

Funciones:

```ts
clearAuthSession()
logoutUser({ redirectTo: '/' })
```

Ahora los siguientes componentes usan la misma lógica:

```txt
src/components/AuthMock.tsx
src/components/editorial/EditorialHeader.tsx
src/components/editorial/MobileEditorialNav.tsx
```

## Riesgo mitigado

- Code duplication.
- Collision / route name clash.
- Logout inconsistente.
- UX drift entre desktop, mobile y AuthMock.

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-01.ps1
.\scripts\qa\smoke-emergency-dry-01.ps1
npm install
npm run build
```

## No toca

- Stripe.
- Webhooks.
- Supabase.
- Órdenes.
- Emails.
- CSS visual.
