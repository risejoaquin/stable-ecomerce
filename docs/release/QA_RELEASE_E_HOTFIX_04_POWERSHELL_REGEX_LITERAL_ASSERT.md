# QA RELEASE E HOTFIX 04 — PowerShell Regex Literal Assert

## Problema

El smoke final fallaba en PowerShell al evaluar un patrón con paréntesis y pipes para validar el service worker:

```txt
Demasiados ).
```

La aplicación y producción no fallaban; el problema era del uso de `-match`, que interpreta el patrón como expresión regular.

## Corrección

Se agregó `Assert-ContainsLiteral(...)` para validar texto exacto con `.Contains(...)` cuando el patrón contiene caracteres reservados de regex.

## Alcance

- No cambia frontend.
- No cambia backend.
- No cambia base de datos.
- No cambia service worker.
- Solo corrige el script QA final.
