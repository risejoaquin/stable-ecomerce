# MOBILE/UX B HOTFIX 02 — PowerShell UTF-8 Smoke Assert

## Diagnóstico

El smoke `smoke-mobile-ux-b.ps1` fallaba al buscar el literal `Limpiar búsqueda` aunque `SearchBar.tsx` contenía correctamente `aria-label="Limpiar búsqueda"`.

La salida `Limpiar bÃºsqueda` confirma una diferencia de decodificación UTF-8 en el proceso de PowerShell/Select-String del entorno Windows. El fallo pertenece al validador, no al componente React.

## Corrección

El assert se cambió a un marcador ASCII estable del mismo contrato accesible:

`aria-label="Limpiar`

Esto sigue verificando que el botón de limpieza exponga un `aria-label` explícito sin depender de la representación de caracteres acentuados del host.

## Alcance

- Solo cambia `scripts/qa/smoke-mobile-ux-b.ps1`.
- No cambia runtime, React, CSS, API, auth, Stripe, emails, service worker ni configuración Vite.
- Se mantiene todo MOBILE/UX B.

## Gate

Reejecutar `scripts/qa/smoke-mobile-ux-b.ps1`, regresiones de AUDIT A/Login, `npm run build`, commit/push, deploy y smoke de producción antes de cerrar MOBILE/UX B.
