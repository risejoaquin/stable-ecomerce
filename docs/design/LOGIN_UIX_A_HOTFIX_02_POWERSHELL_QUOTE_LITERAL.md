# LOGIN UIX A HOTFIX 02 — PowerShell Quote Literal Assert

## Motivo

El smoke anterior usaba cadenas PowerShell con comillas dobles escapadas con backslash (`\"`). En PowerShell, el backslash no escapa comillas dobles, por eso el argumento se partía y el smoke buscaba `role=\` en vez de `role="dialog"`.

## Corrección

Las validaciones HTML/TSX con comillas dobles ahora usan strings PowerShell con comillas simples:

```powershell
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'role="dialog"' "auth modal has dialog role"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'aria-modal="true"' "auth modal has aria modal"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'autoComplete="email"' "auth email autocomplete configured"
Assert-ContainsLiteral "src\components\AuthMock.tsx" 'role="alert"' "auth error uses alert role"
```

No cambia frontend, backend, auth ni producción. Solo corrige el smoke test.
