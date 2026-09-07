# QA RELEASE E HOTFIX 05 — Assert-ContainsLiteral Applied

## Motivo

El hotfix anterior agregó la función `Assert-ContainsLiteral`, pero una aserción crítica seguía llamando a `Assert-Contains`, que usa `-match` y trata el patrón como regex.

## Corrección

La validación del fallback del service worker ahora usa comparación literal con `.Contains(...)`:

```powershell
Assert-ContainsLiteral "public\sw.js" "cached || caches.match('/') || offlineHtmlResponse()" "service worker never falls back to undefined cached response"
```

## Alcance

- No cambia frontend.
- No cambia backend.
- No cambia base de datos.
- No cambia service worker.
- Solo corrige el smoke final de QA.
