# POST-UX A HOTFIX 01 — NPM Audit Invoker

## Causa

El smoke original invocaba `npm audit` directamente desde PowerShell. En el entorno Windows validado el wrapper terminó interpretándose incorrectamente y npm recibió `pm` como subcomando (`Unknown command: "pm"`).

## Corrección

El gate ejecuta ahora npm mediante `cmd.exe /d /s /c 'npm audit --audit-level=high'`, captura el código de salida y conserva el output completo del audit.

## Estado de dependencias

`brace-expansion` permanece fijado a `5.0.9` mediante `overrides` y `package-lock.json` se conserva resuelto a la misma versión.

El hotfix no intenta ocultar vulnerabilidades: si npm reporta HIGH o CRITICAL, POST-UX A permanece OPEN y el log debe utilizarse para un hardening dirigido.
