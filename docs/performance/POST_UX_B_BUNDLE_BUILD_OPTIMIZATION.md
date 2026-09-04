# POST-UX B — Bundle & Build Optimization

## Objetivo
Reducir el vendor principal y eliminar la salida Windows `dist/C:/Users/...` sin romper los contratos estabilizados de lazy routes, service worker, checkout, Stripe o manualChunks.

## Cambios
- Se reemplaza `vite-plugin-compression` en runtime de Vite por `selfcare-stable-compression`, implementado con `node:zlib` y `node:fs`.
- Los `.gz` y `.br` se escriben junto a cada asset dentro de `dist/`, usando rutas resueltas por Node y sin interpolar rutas absolutas de Windows.
- Se mantiene el grupo React + ReactDOM + React Router + lucide-react dentro de `vendor` para proteger el fix histórico del circular chunk / blank screen.
- Se separan grupos seguros: `vendor-observability`, `vendor-ui` y dependencias D3/Victory de `vendor-charts`.
- No se agregan ni cambian dependencias. No requiere `npm install`.

## Gates
1. `smoke-post-ux-b.ps1` PASS.
2. `npm run build` PASS.
3. No debe aparecer `dist/C:/` en el output ni existir una carpeta `dist/C:`.
4. El vendor principal debe bajar respecto al baseline ~732.80 kB. Objetivo de fase: <650 kB; objetivo deseable: <500 kB.
5. `smoke-mobile-ux-f.ps1` PASS.
6. `smoke-qa-release-e.ps1` PASS en producción.
