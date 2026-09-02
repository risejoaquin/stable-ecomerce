# MACRO EMAIL/UIX A.1 — Build Fix

## Problema
Railway falló en `bun run build` por un regex incompleto dentro de `server.ts`:

```txt
server.ts:885:61 Unterminated regular expression
```

## Causa
En el handler `POST /api/contact`, la línea que sanitiza saltos de línea quedó partida en dos líneas:

```ts
const safeMessage = escapeHtml(message).replace(/
/g, '<br/>');
```

Al partirse físicamente después de `replace(/`, TypeScript lo interpreta como expresión regular sin cerrar.

## Corrección
Se reemplazó por una expresión regular válida y robusta para Windows/Linux:

```ts
const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br/>');
```

## Alcance
No cambia lógica de negocio, pagos, webhooks, Supabase ni Stripe. Es un hotfix de compilación sobre MACRO EMAIL/UIX A.
