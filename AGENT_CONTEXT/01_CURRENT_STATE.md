# CURRENT STATE

## Estado conocido

- Producto ecommerce full-stack en producción.
- GitHub repo: `risejoaquin/stable-ecomerce`
- Branch principal: `main`
- Supabase project ref: `dporfgsbwsyqzmlnqrug`
- Railway: deployment activo y exitoso.
- GitHub Quality Gate: PASS en commit `555c5176b2203a382a77b79cf6505518580b991a`.
- Production Smoke de GitHub: PASS (ejecutado y verificado).
- Stripe CLI local: autenticado.
- GitHub CLI `gh`: autenticado.
- Supabase producción: `ACTIVE_HEALTHY`.
- Supabase remote baseline migration: establecida y sincronizada (`20260918004527_remote_schema.sql`).
- Base de datos de producción contiene módulos avanzados y tablas de POST-LAUNCH 20.
- SEC-005: remediado con `loginLimiter` dedicado (10 req / 15 min por IP).

## Cobertura actual relevante

- E2E: 20/20 pruebas pasando en Playwright (storefront, producto, carrito, auth, checkout, órdenes, accesibilidad).
- Unit & API: 66/66 pruebas pasando.
- Accesibilidad Axe: 6 superficies escaneadas con 0 violaciones críticas (WCAG 2.0 A & AA).
- Secret Scan: 0 secretos detectados.
- Release Gate: PASS (8/8 compuertas).

## Fase actual

- `QA / RELEASE E = CLOSED / ROADMAP PASS`
- `POST-LAUNCH 20 = ACTIVE`

## Siguiente fase

`POST-LAUNCH 21 = PENDING` (bloqueada hasta validación de POST-LAUNCH 20)
