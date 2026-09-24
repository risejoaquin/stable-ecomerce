# Evidence Format

Cada validación debe registrar:

```text
CHECK:
AGENT:
DATE/TIME:
ENVIRONMENT:
COMMIT SHA:
COMMAND:
EXPECTED:
ACTUAL:
RESULT: PASS | FAIL | BLOCKED
EVIDENCE FILE:
NOTES:
```

## Evidence folders

```text
AGENT_CONTEXT/evidence/
├── block-a/
├── block-b/
├── block-c/
├── build/
├── tests/
├── playwright/
├── accessibility/
├── stripe/
├── supabase/
├── github/
├── railway/
├── production/
└── logs/
```

Evitar guardar:
- secrets
- tokens
- raw credentials
- service role keys
- Stripe secret keys
- DB passwords
