# EMERGENCY-DRY-05 — Account Menu & Types Consolidation

## Objetivo

Consolidar el menú de cuenta y los tipos compartidos para eliminar duplicación, drift funcional y colisiones de definición.

## Problemas corregidos

1. `EditorialHeader` tenía su propia implementación de menú de cuenta.
2. `MobileEditorialNav` tenía su propia implementación de bottom sheet de cuenta.
3. `AuthMock.UserButton` mantenía otra implementación de menú de usuario.
4. `src/types.ts` y `src/types/index.ts` definían tipos similares pero incompatibles.
5. El modal de autenticación estaba acoplado a `AuthMock`, dificultando reutilización desde componentes compartidos.

## Cambios aplicados

- Se creó `src/components/account/account-links.ts` como fuente única de navegación de cuenta.
- Se creó `src/components/account/AccountMenu.tsx` para menú desktop.
- Se creó `src/components/account/AccountMobileSheet.tsx` para menú mobile.
- `EditorialHeader` reutiliza `AccountMenu`.
- `MobileEditorialNav` reutiliza `AccountMobileSheet`.
- `AuthMock.UserButton` reutiliza `AccountMenu`.
- Se creó `src/lib/auth-modal.ts` para abrir el modal de auth sin ciclos entre componentes.
- `src/types.ts` queda como re-export de compatibilidad.
- `src/types/index.ts` queda como fuente canónica de tipos.

## Resultado esperado

- Un solo menú desktop de cuenta.
- Un solo bottom sheet mobile de cuenta.
- Un solo mapa de links de cuenta.
- Admin visible solo si `role === 'admin'`.
- Logout centralizado sigue usando `logoutUser()`.
- No hay duplicación de tipos `Product` / `StoreConfig`.
- Imports antiguos desde `./types` siguen funcionando.

## Validación

Ejecutar:

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-05.ps1
.\scripts\qa\smoke-emergency-dry-05.ps1
npm run build
```
