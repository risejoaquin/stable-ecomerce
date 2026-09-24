# QA / RELEASE E — Acceptance Criteria

No cerrar QA E si falta cualquiera de estos puntos:

## Functional
- storefront regression evidence
- auth regression evidence
- admin regression evidence
- checkout/payment evidence
- orders evidence
- email evidence
- authorization evidence

## Quality
- accessibility evidence
- responsive evidence
- real API health evidence
- lint PASS
- tests PASS
- E2E PASS
- build PASS

## Production
- dependency/security review
- rate limit review
- input validation review
- database reproducibility
- Supabase access-model review
- GitHub CI evidence
- Railway deploy PASS
- production smoke PASS
- logs reviewed

## Final

Debe existir un reporte final que consolide:

```text
Block A
Block B
Block C
Known issues
Remaining non-blocking debt
Final blockers
Evidence paths
Commit SHA
Deployment state
```

Sólo ChatGPT Web puede emitir ROADMAP PASS.
