# QA RELEASE E HOTFIX 01 — PowerShell HOME variable fix

## Problema

El smoke final fallaba únicamente cuando se ejecutaba la validación opcional contra producción:

```txt
FAIL production home request failed: No se puede sobrescribir la variable HOME porque es de solo lectura o constante.
```

La causa era el uso de `$home` como variable local en `scripts/qa/smoke-qa-release-e.ps1`. PowerShell trata `HOME` como variable reservada/constante en algunos entornos, por lo que `$home` puede colisionar.

## Corrección

Se renombró la variable local:

```powershell
$home -> $homeResponse
```

## Alcance

No cambia lógica de aplicación, frontend, backend, rutas ni base de datos. Solo corrige el script de validación.

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-qa-release-e.ps1
.\scripts\qa\smoke-qa-release-e.ps1 -BaseUrl "https://selfcaresinners.com"
npm run build
```

## Resultado esperado

```txt
PASS production home responds
PASS qa release e final regression accessibility production closure checks
```
