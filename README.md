# E-commerce Platform (Full-Stack)

Plataforma de comercio electrónico de alto rendimiento y completa, construida con React (Vite), Node.js (Express), y PostgreSQL (Supabase).

## 🌟 Características del Frontend (React + Vite)

### 🛍️ Storefront (Experiencia de Cliente)
- **Navegación y Búsqueda Avanzada:** Búsqueda en tiempo real, filtros dinámicos (categorías, precio, marcas) y paginación para explorar el catálogo eficientemente.
- **Detalle de Producto:** Selección de variantes, galería de imágenes, stock en tiempo real y sistema de reseñas/calificaciones (1 a 5 estrellas).
- **Checkout Optimizado:** Flujo de compra fluido con validación de Cupones de descuento (fijos o porcentuales) en tiempo real.
- **Gestión de Cuentas y Perfil:** Autenticación de usuarios, actualización de información personal y seguimiento de pedidos (*Order Tracking*).
- **Lista de Deseos (Wishlist):** Sistema para que los clientes guarden sus productos favoritos para futuras compras.
- **Recuperación de Carritos Abandonados:** Experiencia dedicada para recuperar sesiones de compras interrumpidas.
- **SEO & Accesibilidad:** Meta tags dinámicos mediante React Helmet Async (`SEO.tsx`), y diseño responsivo para móviles, tablets y escritorio.
- **Componentes de UX:** Consentimiento de cookies (`CookieConsent`), manejo de errores globales (`ErrorBoundary`), estados vacíos visuales (`EmptyState`).

### ⚙️ Admin Dashboard (Panel de Administración)
- **Dashboard y Analíticas:** Visualización de datos utilizando **Recharts**. Estadísticas en tiempo real de ingresos, productos más vendidos, uso de cupones y últimas órdenes.
- **Gestión de Catálogo (Productos y Categorías):** CRUD completo para inventario. Subida de imágenes, administración de variantes y control de niveles de stock.
- **Gestión de Órdenes:** Visualización completa del ciclo de vida de los pedidos. Asignación de números de rastreo y **Procesamiento de Reembolsos de Stripe (Refunds)** directo desde el panel.
- **Gestión de Clientes (CRM):** Listado de clientes registrados y su historial de compras.
- **Motor de Cupones Promocionales:** Creación de campañas de descuento (fijo o porcentaje), limitados por fecha de expiración o usos máximos.
- **Personalización de Tienda (Store Builder):** Cambios de configuración en tiempo real (Colores primarios, Tipografías, Layouts y Formas de los componentes). Todo persistido y propagado globalmente vía `ThemeProvider`.

---

## 🛠️ Características del Backend (Node.js + Express)

### 🔒 Autenticación y Seguridad
- **Sistema JWT (JSON Web Tokens):** Manejo de sesiones sin estado, autenticación segura y cifrado de contraseñas con `bcryptjs`.
- **Middlewares de Protección:** Control de acceso basado en roles (Admin vs. Usuario regular).
- **Rate Limiting:** Protección activa (throttling) contra fuerza bruta en endpoints críticos (Login, Checkout, Formularios de Contacto).
- **Seguridad HTTP:** Implementación de `helmet` para prevenir vulnerabilidades comunes y configuración estricta de CORS.

### 💳 Pagos e Idempotencia (Stripe)
- **Stripe Checkout Sessions:** Generación de sesiones de pago 100% seguras y compatibles con PCI.
- **Webhooks de Stripe Robustos:** 
  - Manejo asíncrono de eventos de pago (ej. `checkout.session.completed`).
  - **Mecanismo de Idempotencia:** Validación en la base de datos a través de la tabla `stripe_events` (evita que un pago o webhook duplicado emita los productos dos veces).
  - **Actualización de Inventario Atómica:** Decremento seguro del stock empleando funciones Postgres RPC (`decrement_stock`) para prevenir *race conditions*.

### 🗄️ Base de Datos y Supabase (PostgreSQL)
- **Row Level Security (RLS):** Las consultas públicas directas están bloqueadas, canalizando todo de forma segura a través del *Service Role Key* del servidor.
- **Modelo de Datos Relacional (9 Tablas):** `users`, `stores`, `products`, `orders`, `order_items`, `coupons`, `abandoned_carts`, `reviews`, y `stripe_events`.

### 📧 Mensajería y Almacenamiento
- **Notificaciones por Correo (Resend):**
  - Correos de confirmación de órdenes al cliente (con desglose de items).
  - Alertas instantáneas al Administrador sobre nuevas ventas.
  - Correos de verificación de cuenta y recuperación de contraseña.
- **Archivos Estáticos:** Upload de archivos local vía `multer` (`/api/upload`).

### 📊 Observabilidad y Manejo de Errores
- **Logging Estructurado:** Logs HTTP enriquecidos con `pino` y `pino-http`.
- **Rastreo de Frontend:** Endpoint dedicado (`/api/log-error`) para recibir y guardar errores que ocurran en el navegador de los clientes.
- **Monitoreo con Sentry:** Integración en cliente y servidor para captura automática de excepciones.

---


## 🧪 Pruebas Automatizadas (Testing Suite)

Se ha implementado una robusta suite de pruebas que garantiza la calidad del código:

- **Unit Tests (Pruebas Unitarias):** Desarrolladas con `vitest` y `@testing-library/react` para validar componentes UI individuales (ej. `Pagination.test.tsx`).
- **Integration Tests (Pruebas de Integración):** Aseguran que la API backend funcione correctamente empleando `supertest` (ej. endpoints de salud y autenticación en `tests/api`).
- **E2E Tests (Pruebas End-to-End):** Implementadas con `Playwright` (`@playwright/test`). Prueban los flujos críticos de la aplicación en navegadores reales (ej. la carga de la página inicial en `e2e/home.spec.ts`).

### Ejecutar las Pruebas

```bash
# Ejecutar pruebas unitarias y de integración (Vitest)
npm run test

# Ejecutar pruebas End-to-End (Playwright)
npm run test:e2e
```

## 🚀 Despliegue (Build)

Este proyecto emplea un modelo de compilación unificado Full-Stack para facilitar su alojamiento en contenedores (Google Cloud Run, Railway, etc.):

1. **Construir artefactos:**
   ```bash
   npm run build
   ```
   *Transpila el Frontend (Vite) hacia `/dist` y empaqueta el servidor (`server.ts`) como un binario unificado Node.js en `/dist/server.cjs` empleando esbuild.*

2. **Iniciar Producción:**
   ```bash
   npm run start
   ```
   *Inicia Express, sirve las APIs y auto-redirige a la SPA de React.*

## Phase C — Ecommerce Operations & Admin Hardening

This checkpoint adds admin operations visibility and fulfillment hardening. Before validating Phase C in production, run:

```txt
scripts/db/004_ecommerce_operations_admin_hardening.sql
```

Primary validation targets:

```txt
GET /api/admin/operations/summary = 200
GET /api/admin/orders = 200
GET /api/admin/stripe-events = 200
GET /api/admin/inventory/movements = 200
Order status update creates audit/timeline records
Tracking update creates audit/timeline records
```

## Phase D checkpoint

SUPERFASE D — Storefront Completion & Customer Experience.

Required migration before validation:

```sql
scripts/db/005_storefront_customer_experience_and_timeline.sql
```

Validates commercial home, product detail, cart UX, FAQ, public order tracking with timeline, Selfcare Sinners branding, and D.0 real order status timeline trigger.


## Hotfix D.1 — Public Order Tracking Resilience

Fixes `/api/orders/track` so invalid/missing email matches return 404 instead of PostgREST single-object 500 errors. Legacy manually finalized orders may need `customer_email` backfill for public tracking.

## Production checkpoint — SUPERFASE E

SEO, performance, accessibility and production polish included.

Required DB migration:

```sql
scripts/db/006_seo_performance_accessibility_polish.sql
```

Post-deploy validation:

- `GET /robots.txt` → 200
- `GET /sitemap.xml` → 200 XML
- `GET /api/seo/products` → 200
- Home/Product/FAQ render canonical, Open Graph and JSON-LD metadata.
- PWA manifest shows Selfcare Sinners branding.

## SUPERFASE F — DevOps, Observability, QA, Backup & Launch Readiness

Production readiness package added:

- `/api/health`
- `/api/readiness`
- `/api/admin/diagnostics`
- `/api/admin/diagnostics/stripe`
- `/api/admin/diagnostics/supabase`
- `/api/admin/diagnostics/orders`
- `/api/admin/diagnostics/security`
- `scripts/db/007_devops_observability_qa_launch_readiness.sql`
- `scripts/qa/smoke-production.ps1`
- `scripts/qa/smoke-admin.ps1`
- production runbooks under `docs/production/`

Apply the DB migration before validating diagnostics.

## POST-LAUNCH 02 — Commercial Operations & Growth Readiness

Added commercial growth readiness layer:

- `scripts/db/008_post_launch_commercial_growth_readiness.sql`
- `/api/admin/commercial/summary`
- `/api/admin/product-readiness`
- `/api/admin/campaigns`
- `/api/admin/reviews`
- `/api/public/policies`
- `/admin/commercial`
- `scripts/qa/smoke-commercial.ps1`

Validation target:

```powershell
.\scripts\qa\smoke-commercial.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## POST-LAUNCH 03 — Brand, Catalog & Conversion Optimization

Entrega enfocada en catálogo real, categorías comerciales, eventos de conversión, preparación para tráfico pagado y panel comercial/growth.

Migración requerida:

```sql
scripts/db/009_post_launch_03_brand_catalog_conversion_optimization.sql
```

Smoke test:

```powershell
Unblock-File .\scripts\qa\smoke-growth.ps1
.\scripts\qa\smoke-growth.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## POST-LAUNCH 04 — Content, Email, Reviews & Retention

Entrega enfocada en emails, newsletter, soporte, lifecycle events, reviews y abandoned cart recovery.

Migración requerida:

```sql
scripts/db/010_post_launch_04_content_email_reviews_retention.sql
```

Smoke test:

```powershell
.\scripts\qa\smoke-retention.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## POST-LAUNCH 05 — Analytics, Ads, Automation & Revenue Operations

Entrega enfocada en tracking de conversión, UTM attribution, dashboard revenue ops, funnels, automatizaciones base y preparación para tráfico pagado.

### Migración

Ejecutar en Supabase:

```sql
scripts/db/011_post_launch_05_analytics_ads_automation_revenue_ops.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke test

```powershell
Unblock-File .\scripts\qa\smoke-revenue.ps1
.\scripts\qa\smoke-revenue.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

### Endpoints principales

- POST `/api/analytics/conversion`
- POST `/api/analytics/utm`
- GET `/api/admin/revenue/summary`
- GET `/api/admin/revenue/funnel`
- GET `/api/admin/revenue/campaigns`
- GET `/api/admin/revenue/customers`
- GET `/api/admin/revenue/automation`
- POST `/api/admin/automation/run`


## POST-LAUNCH 06 — Paid Traffic Readiness & Conversion Hardening

Incluye landing pages por campaña, product feed readiness, Meta/Google Ads integration points, conversion API readiness, A/B testing foundation, trust badges y smoke test de paid traffic.

Migración: `scripts/db/012_post_launch_06_paid_traffic_conversion_hardening.sql`

Smoke: `scripts/qa/smoke-paid-traffic.ps1`

## POST-LAUNCH 07 — Real Catalog Import, Merchandising & Sales Enablement

Adds real catalog import, catalog QA, merchandising rules, product media assets and sales enablement readiness.

Required DB migration:

```sql
scripts/db/013_post_launch_07_real_catalog_merchandising_sales_enablement.sql
```

Smoke test:

```powershell
.\scripts\qa\smoke-catalog-sales.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## POST-LAUNCH 08 — Fulfillment, Support Operations & Customer Service Hardening

Entrega enfocada en operación diaria: fulfillment, tracking avanzado, SLA de soporte, tickets, incidencias, cambios/devoluciones, plantillas de respuesta e historial de servicio por pedido.

### Migración

Ejecutar en Supabase:

```sql
scripts/db/014_post_launch_08_fulfillment_support_customer_service.sql
```

### Smoke

```powershell
Unblock-File .\scripts\qa\smoke-fulfillment-support.ps1

.\scripts\qa\smoke-fulfillment-support.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```
