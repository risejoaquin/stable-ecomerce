# SUPERFASE E — SEO, Performance, Accessibility & Production Polish

## Objetivo
Preparar Selfcare Sinners para tráfico real con SEO técnico, Open Graph, PWA básica, sitemap, robots, metadata por producto, polish móvil y mejores bases de accesibilidad.

## Cambios incluidos

- SEO component actualizado para canonical URL, Open Graph, Twitter Card, robots y JSON-LD.
- JSON-LD de Organization, WebSite, Product y FAQPage.
- URLs canónicas de producto con slug: `/product/:id/:slug`.
- Endpoint público `GET /sitemap.xml` con páginas estáticas y productos activos.
- Endpoint público `GET /robots.txt` con sitemap y bloqueo de áreas privadas/API.
- Endpoint `GET /api/seo/products` para auditar productos indexables.
- Manifest PWA completo con nombre, short name, theme color, categorías e iconos.
- Service worker básico para shell público y assets no API.
- `index.html` con idioma `es-MX`, meta base, Open Graph base y mobile polish.
- Migración `006_seo_performance_accessibility_polish.sql` para columnas SEO e índices.

## Validación esperada

- `/robots.txt` responde 200 con `Sitemap: https://selfcaresinners.com/sitemap.xml`.
- `/sitemap.xml` responde 200 XML e incluye `/`, `/faq`, `/track`, páginas legales y productos activos.
- `/api/seo/products` responde 200 con productos activos y `canonical_path`.
- Home y producto incluyen meta title/description/OG/canonical desde React Helmet.
- Product detail usa JSON-LD Product.
- FAQ usa JSON-LD FAQPage.
- Manifest instala como Selfcare Sinners.
- Console sin errores nuevos de PWA/SEO.

## Riesgos

- Vite/SPA no hace SSR real; los meta tags se insertan en cliente. Para SEO máximo futuro, evaluar prerender/SSR.
- El service worker evita cachear `/api` y `/admin`, pero debe observarse después de cada deploy para evitar assets viejos.
