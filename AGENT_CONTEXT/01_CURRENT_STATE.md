# CURRENT STATE

## Estado conocido

- Producto ecommerce full-stack en producción.
- GitHub repo: `risejoaquin/stable-ecomerce`
- Branch principal: `main`
- Supabase project ref: `dporfgsbwsyqzmlnqrug`
- Railway: deployment activo y exitoso.
- GitHub Quality Gate: PASS en commit `6a2b265bc29601c1f2143bf4b99a7a7b9e637e6d`.
- Production Smoke de GitHub: PASS (ejecutado y verificado).
- Stripe CLI local: autenticado.
- GitHub CLI `gh`: autenticado.
- Supabase producción: `ACTIVE_HEALTHY`.
- Supabase remote baseline migration: establecida y sincronizada (`20260918004527_remote_schema.sql`).
- Base de datos de producción contiene módulos avanzados y tablas de POST-LAUNCH 20.
- SEC-005: remediado con `loginLimiter` dedicado (10 req / 15 min por IP).
- PL20-02: cerrado con modelo de confianza estricto para evidencia CI.
- PL20-03A: contrato de evidencia de costos de operación activo (Railway, Supabase, Stripe, Resend).

## Cobertura actual relevante

- E2E: 20/20 pruebas pasando en Playwright (storefront, producto, carrito, auth, checkout, órdenes, accesibilidad).
- Unit & API: 116/116 pruebas pasando.
- Accesibilidad Axe: 6 superficies escaneadas con 0 violaciones críticas (WCAG 2.0 A & AA).
- Secret Scan: 0 secretos detectados.
- Release Gate: PASS (8/8 compuertas).

## Fase actual

- `QA / RELEASE E = CLOSED / ROADMAP PASS`
- `POST-LAUNCH 20 = ACTIVE`
  - `PL20-01 = PASS`
  - `PL20-02 = PASS / CLOSED`
  - `PL20-03 = AUTHORIZED / ACTIVE`

## Siguiente fase

`POST-LAUNCH 21 = PENDING` (bloqueada hasta validación de POST-LAUNCH 20)
