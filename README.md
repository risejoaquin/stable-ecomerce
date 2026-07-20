# E-commerce Full-Stack Platform

Una plataforma de comercio electrónico completa, moderna y escalable construida con React, Vite, Tailwind CSS y un backend robusto en Node.js (Express).

## 🚀 Características Principales

### 🛍️ Experiencia de Cliente (Storefront)
*   **Catálogo Avanzado:** Búsqueda en tiempo real, filtros por múltiples categorías, subcategorías, rango de precios y ordenamiento personalizado.
*   **Detalle de Producto Completo:** Visualización detallada con galería de imágenes, selector de variantes, sección de productos similares y sistema de reseñas con calificación por estrellas.
*   **Carrito de Compras Persistente:** Gestión del carrito fluida y en tiempo real.
*   **Checkout Seguro:** Integración total con Stripe para procesar pagos y tarjetas de crédito de forma segura.
*   **Lista de Deseos (Wishlist):** Permite a los usuarios guardar productos para compras futuras.
*   **Seguimiento de Pedidos:** Página dedicada para que los usuarios puedan rastrear el estado de sus órdenes.
*   **Carritos Abandonados:** Funcionalidad para recuperar carritos que no terminaron su proceso de pago.
*   **Páginas Legales:** Términos y Condiciones, Políticas de Privacidad, Devoluciones y Contacto.

### 🔒 Autenticación y Cuentas de Usuario
*   **Sistema de Cuentas Propio:** Registro, inicio de sesión y perfiles de usuario utilizando JWT.
*   **Seguridad:** Contraseñas encriptadas de forma segura.
*   **Flujos de Correo:** Verificación de correo electrónico y recuperación de contraseña a través de Resend.
*   **Panel de Perfil:** Los usuarios pueden gestionar su información y revisar el historial completo de sus pedidos.

### ⚙️ Panel de Administración (Dashboard)
*   **Dashboard Analítico:** Gráficos visuales que muestran ventas mensuales, ventas de los últimos 30 días, ticket promedio, clientes únicos y productos más vendidos.
*   **Gestión de Productos (CRUD):** Creación y edición de productos con soporte para **múltiples categorías** simultáneas, subcategorías, variantes, múltiples imágenes y control de stock.
*   **Gestión de Categorías:** Sistema estructurado para administrar categorías principales y sus respectivas subcategorías.
*   **Gestión de Pedidos:** Listado de órdenes, detalles completos, historial de pagos, cambio de estados (pagado, enviado, entregado) y procesamiento de reembolsos conectados a Stripe.
*   **Gestión de Cupones:** Creación de códigos de descuento (porcentaje o valor absoluto), con límites de usos, montos mínimos de compra y seguimiento.
*   **Gestión de Clientes:** Visualización y control sobre los clientes registrados en la tienda.
*   **Configuración (Settings):** Personalización del color principal del tema de la tienda desde el panel.

### 📧 Sistema de Notificaciones Automáticas (Resend)
*   **Confirmación de Cuenta:** Bienvenida al registrarse.
*   **Confirmación de Compra:** Recibo detallado del pedido enviado automáticamente al pagar.
*   **Actualizaciones de Estado:** Avisos de paquete enviado o entregado.
*   **Carritos Abandonados:** Correos automatizados invitando a recuperar la compra.
*   **Promociones:** Correos para entregar códigos de descuento.

## 💻 Stack Tecnológico

*   **Frontend:** React 18, Vite, Tailwind CSS, React Router DOM, React Query, Zustand (Manejo de estado), Recharts (Gráficos).
*   **Backend:** Node.js, Express.js, TypeScript.
*   **Base de Datos y Almacenamiento:** Supabase (PostgreSQL relacional) y Supabase Storage (para imágenes de productos).
*   **Pagos:** Stripe (Checkout Sessions & Webhooks).
*   **Emails:** Resend API.
*   **Autenticación:** JSON Web Tokens (JWT) y bcryptjs.

## 🛠️ Configuración Local

1.  Clonar el repositorio.
2.  Instalar dependencias: `npm install`
3.  Configurar las variables de entorno en un archivo `.env` (basado en `.env.example`).
4.  Ejecutar el servidor de desarrollo: `npm run dev`

### Variables de Entorno Requeridas (`.env`)
```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_DB_URL=tu_connection_string_de_postgresql
STRIPE_SECRET_KEY=tu_stripe_secret_key
STRIPE_WEBHOOK_SECRET=tu_stripe_webhook_secret
RESEND_API_KEY=tu_resend_api_key
JWT_SECRET=tu_jwt_secret
VITE_API_URL=/api
```

## 📦 Despliegue a Producción

El proyecto está diseñado para compilarse como una aplicación full-stack unificada:
1. `npm run build` compilará el frontend y el backend a código de producción.
2. `npm start` iniciará el servidor Express sirviendo la API y la aplicación web compilada simultáneamente.
