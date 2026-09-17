# CURRENT STATE

## Estado conocido

- Producto ecommerce full-stack en producción.
- GitHub repo: `risejoaquin/stable-ecomerce`
- Branch principal: `main`
- Supabase project ref: `dporfgsbwsyqzmlnqrug`
- Railway: deployment actual observado como exitoso.
- GitHub Quality Gate: último commit auditado observado como PASS.
- Production Smoke de GitHub: últimos runs observados como `skipped`, requiere cierre real.
- Stripe CLI local: autenticado.
- GitHub CLI `gh`: autenticado.
- Supabase producción: `ACTIVE_HEALTHY`.
- Supabase remote migration history observado vacío.
- Base de datos de producción contiene módulos avanzados y tablas de POST-LAUNCH 20.

## Cobertura actual relevante

E2E actual conocido:
- home load
- responsive overflow

Cobertura insuficiente para:
- storefront real
- auth
- checkout
- orders
- admin
- accessibility
- email flows

## Fase actual

`QA / RELEASE E = ACTIVE`

## Siguiente fase

`POST-LAUNCH 20 = BLOCKED until ROADMAP PASS`
