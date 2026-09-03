# MOBILE/UX B HOTFIX 01 — PowerShell HOME Variable Collision

## Estado

HOTFIX IMPLEMENTED — pending user validation.

## Problema

`scripts/qa/smoke-mobile-ux-b.ps1` declaraba `$home` para apuntar a `src/pages/store/HomePage.tsx`.
PowerShell trata los nombres de variables sin distinguir mayúsculas/minúsculas, por lo que `$home` colisionaba con la variable automática `$HOME`, que es de solo lectura.

Error observado:

`No se puede sobrescribir la variable HOME porque es de solo lectura o constante.`

## Corrección

Se renombró la variable local del smoke de `$home` a `$homePage` y se actualizaron sus referencias.

## Alcance

- No cambia código runtime.
- No cambia React, CSS, backend, Stripe, auth, emails, service worker ni Vite.
- Solo corrige el smoke PowerShell de MOBILE/UX B.

## Gate

Ejecutar `scripts/qa/smoke-mobile-ux-b.ps1`. Si finaliza con:

`PASS MOBILE/UX B - storefront mobile adaptability checks`

el hotfix queda validado.
