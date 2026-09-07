# EMERGENCY-DRY-04.1 — CSS Build Fix

## Problema
Railway falló durante `vite build` por un error PostCSS:

```txt
/app/src/styles/uix-soft-premium-system.css:737:1: Unknown word \n
```

La causa fue que el archivo consolidado `uix-soft-premium-system.css` contenía secuencias literales `\n` antes de comentarios de separación de fuentes CSS heredadas.

## Corrección
Se reemplazaron las secuencias literales `\n/* ... */` por saltos de línea CSS reales:

```css
/* ===== END LEGACY SOURCE: ... ===== */
/* ===== BEGIN LEGACY SOURCE: ... ===== */
```

## Alcance
No cambia comportamiento visual intencional, rutas, backend, Stripe, Supabase, auth ni correos. Solo corrige sintaxis CSS para que PostCSS/Vite pueda compilar.

## Validación esperada

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-04.ps1
.\scripts\qa\smoke-emergency-dry-04.ps1
npm run build
```

Resultado esperado: `vite build` debe avanzar más allá de `uix-soft-premium-system.css` sin `Unknown word \n`.
