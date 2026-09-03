# LOGIN UIX A HOTFIX 01 — Dialog Role Smoke Assert

## Objetivo

Corregir la validación del smoke test del login premium para que el atributo de accesibilidad del modal se valide de forma literal y estable.

## Causa

El diseño del modal ya contiene:

```tsx
role="dialog"
aria-modal="true"
```

El fallo observado venía de una aserción local anterior que buscaba un texto incompleto o escapado incorrectamente (`role=\`).

## Corrección

El smoke test ahora valida literalmente:

```powershell
Assert-ContainsLiteral "src\components\AuthMock.tsx" "role=\"dialog\"" "auth modal has dialog role"
Assert-ContainsLiteral "src\components\AuthMock.tsx" "aria-modal=\"true\"" "auth modal has aria modal"
```

## Alcance

No cambia endpoints, sesión, tokens, backend, base de datos ni auth logic.
