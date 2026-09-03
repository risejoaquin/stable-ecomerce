# QA RELEASE E HOTFIX 02 — Vite Vendor Circular Chunk

## Estado
Hotfix correctivo para blank screen en producción después de PERFORMANCE/FRONTEND D y QA/RELEASE E.

## Síntoma
La app desplegaba correctamente, los smoke tests pasaban, pero el navegador mostraba pantalla en blanco con el error:

```txt
Uncaught TypeError: Cannot set properties of undefined (setting 'Activity')
```

El build también mostraba:

```txt
Circular chunk: vendor -> vendor-react -> vendor. Please adjust the manual chunk logic for these chunks.
```

## Causa
La configuración `manualChunks` separaba React/React DOM/React Router en `vendor-react` mientras otros paquetes relacionados quedaban en `vendor`, generando una dependencia circular entre chunks. El navegador podía evaluar los chunks en un orden donde el namespace esperado aún no estaba inicializado.

## Corrección
React, React DOM, React Router y lucide-react quedan en el mismo chunk estable `vendor`. Se mantienen chunks separados para query, charts, commerce y páginas lazy.

## Impacto
- No cambia backend.
- No cambia base de datos.
- No cambia rutas.
- No cambia lógica de negocio.
- Corrige el blank screen de producción.

## Validación
Ejecutar:

```powershell
Unblock-File .\scripts\qa\smoke-qa-release-e.ps1
.\scripts\qa\smoke-qa-release-e.ps1 -BaseUrl "https://selfcaresinners.com"
npm run build
```

Resultado esperado:

```txt
PASS Vite vendor-react circular chunk removed
PASS production home responds
PASS qa release e final regression accessibility production closure checks
```

En el build ya no debe aparecer:

```txt
Circular chunk: vendor -> vendor-react -> vendor
```
