# QA/RELEASE E HOTFIX 03 — Service Worker Fetch Response Guard

## Estado
Hotfix generado para corregir un error rojo de consola en producción provocado por el service worker.

## Problema
Al navegar a URLs con query params, por ejemplo:

```txt
/?search=Piel%20sensible
```

el service worker podía resolver `event.respondWith(...)` con `undefined` cuando fallaba red y no existía cache compatible.

El navegador reportaba:

```txt
TypeError: Failed to convert value to 'Response'
```

## Causa
El fallback anterior hacía:

```js
.catch(() => cached)
```

Si `cached` no existía, el promise resolvía `undefined`. `respondWith` exige siempre un objeto `Response`.

## Corrección
- Se incrementó la versión del cache a `selfcare-sinners-static-v4`.
- Se incrementó el cache de catálogo a `selfcare-sinners-catalog-v2`.
- Se agregó fallback HTML offline seguro.
- Se agregó fallback JSON seguro para endpoints de catálogo.
- Se evita cachear navegaciones con query params.
- Todo camino de `respondWith` devuelve `Response`.

## Validación esperada

```txt
PASS service worker static cache version bumped
PASS service worker catalog cache version bumped
PASS service worker defines offline HTML fallback
PASS service worker defines offline JSON fallback
PASS service worker never falls back to undefined cached response
PASS service worker avoids caching query-param navigations
PASS service worker fetch response guard checks
```
