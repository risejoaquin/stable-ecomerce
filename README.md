# 🛒 E-commerce Full-Stack Platform

Una plataforma de comercio electrónico unificada, moderna y altamente escalable. Construida para llevar un negocio de principio a fin, proporcionando una excelente experiencia al consumidor y otorgando a los administradores herramientas poderosas para la gestión de productos, órdenes, métricas y marketing.

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

---

## 🚀 Resumen del Proyecto

Este e-commerce no es solo un template visual, es una **aplicación Full-Stack** con un frontend interactivo en React, un backend en Express listo para procesar pagos y correos de forma segura, y una base de datos relacional robusta en PostgreSQL (Supabase).

El flujo abarca desde que un usuario entra como invitado, filtra productos, los añade a un carrito temporal o persistente, se registra, realiza el pago real mediante Stripe, hasta que el administrador gestiona la orden y despacha el paquete. Todo automatizado y sincronizado.

---

## 🛍️ Experiencia del Cliente (Storefront)

El diseño del lado del cliente está optimizado para la conversión y la usabilidad en todos los dispositivos.

*   **Página de Inicio (Home):** Hero banner para ofertas principales, grilla de productos destacados (Top Sellers/Novedades) y llamadas a la acción directas.
*   **Catálogo Avanzado:** 
    *   Búsqueda de productos en tiempo real.
    *   Filtros dinámicos por múltiples **categorías**, **subcategorías**, marcas y rangos de precio.
    *   Ordenamiento por relevancia, precio (menor a mayor / mayor a menor) o novedad.
*   **Detalles del Producto (PDP):**
    *   Galería visual interactiva de imágenes.
    *   Soporte para **múltiples variantes** (Tallas, Colores, Materiales) modificando el stock en base a cada selección.
    *   **Sistema de Reseñas Integrado:** Los clientes autenticados pueden dejar comentarios y calificaciones con estrellas reales almacenadas en la base de datos.
    *   Sección de *Productos Recomendados* o *Similares*.
*   **Flujo de Compra y Carrito:**
    *   **Carrito Persistente:** Mantenimiento de estado global e hidratado con `Zustand`.
    *   **Recuperación de Carritos Abandonados:** Función automática que guarda y avisa a los usuarios que dejaron productos sin finalizar la compra.
*   **Checkout Seguro:**
    *   Integración mediante **Stripe Checkout Sessions** garantizando transacciones PCI-Compliant y soporte para tarjetas de crédito a nivel global.
*   **Gestión de Perfil de Usuario:**
    *   Listado de órdenes históricas, descarga de información de envío, y estado (En proceso, Enviado, Entregado, Cancelado).
    *   Gestión de la **Lista de Deseos (Wishlist)** para separar productos preferidos.
    *   Edición de información personal y seguimiento de pedidos con un *tracking number*.
*   **Rutas Legales:** Vistas dedicadas para Términos y Condiciones, Aviso de Privacidad y Políticas de Reembolso.

---

## 🔒 Autenticación y Seguridad Completa

No dependemos exclusivamente de un servicio Auth externo. Contamos con un sistema interno completamente funcional:

*   **Autenticación Híbrida JWT:** Utilizando `jsonwebtoken` y `bcryptjs` en el backend para firmar y validar tokens de acceso seguros que expiran en 7 días, limitando accesos no autorizados.
*   **Ventanas Modales Contextuales:** Experiencia sin fricción donde los flujos de "Login", "Registro" y "Recuperación de Contraseña" se realizan desde un Modal emergente en lugar de redirigir a una página vacía.
*   **Verificación de Identidad:** Integrado con el API de **Resend** para:
    *   Enviar un enlace de verificación de correo seguro al registrarse.
    *   Enviar tokens efímeros (expiran en 1 hora) para recuperación/reinicio de contraseñas olvidadas de los usuarios.
*   **Protección de Rutas:** Middleware avanzado para diferenciar permisos de un `User` regular vs un `Admin`. Si alguien sin permisos intenta acceder a un panel administrativo, es denegado por el servidor automáticamente.

---

## ⚙️ Panel de Administración (Admin Dashboard)

El "Cuartel General" para los dueños de la tienda. Acceso restingido y validado criptográficamente por JWT.

*   **Dashboard Analítico Central:**
    *   Gráficos visuales avanzados (desarrollados con **Recharts**).
    *   Estadísticas en tiempo real: Ingresos mensuales (BarChart), ventas diarias de los últimos 30 días (LineChart), ticket promedio, clientes únicos y productos más vendidos.
*   **Gestión de Catálogo (CRUD de Productos):**
    *   Crear, actualizar y archivar productos.
    *   Soporte dinámico para crear e introducir múltiples imágenes por producto, inventario (stock) dinámico y marcas.
*   **Gestión de Categorías Estructurada:**
    *   Organización de Categorías principales y sus Subcategorías dependientes, permitiendo menús de navegación complejos en el sitio principal.
*   **Control Total de Órdenes (Logística):**
    *   Vista detallada de lo que compró el cliente y su estado de pago de Stripe.
    *   Actualizar manualmente estados: *Pagado* -> *Enviado* (asignando número de rastreo) -> *Entregado*.
    *   **Procesamiento de Reembolsos Reales:** Con un simple click, el administrador puede ordenar al backend comunicarse con la API de Stripe y emitir un reembolso total o parcial al método de pago original del cliente (impactando directamente a Stripe y cambiando el estatus de la orden).
*   **Marketing y Cupones:**
    *   Creación de códigos promocionales únicos (ej. `VERANO2024`).
    *   Definición de descuentos por un **Monto Fijo** ($10 OFF) o **Porcentaje** (20% OFF).
    *   Definición de límites (ej. *Se puede usar 100 veces en total* o *Requiere compra mínima de $500*).
*   **Personalización Visual (Settings):**
    *   El administrador puede elegir el color acento primario (Theme Color) de la tienda. El backend almacena este color en las configuraciones de la tienda y lo inyecta globalmente en Tailwind en tiempo de ejecución.

---

## 📧 Infraestructura de Notificaciones y Correos

Diseñado para mantener al usuario final informado mediante plantillas HTML bonitas y automatizadas usando **Resend**.

1.  **Registro Exitoso & Verificación:** Envío del link mágico para validar la dirección de correo.
2.  **Confirmación de Compra:** Cuando Stripe confirma el pago vía Webhook, se manda el recibo detallado con el número de orden y desglose de lo pagado.
3.  **Actualizaciones Logísticas:** Notificación inmediata al cliente cuando el administrador marca la orden como enviada o le añade un número de rastreo.
4.  **Recuperación de Carritos:** Cron-job y eventos para detectar carritos abandonados (después de ciertas horas) y mandar un correo automático para incentivar finalizar la compra.
5.  **Recuperación de Acceso:** Enlaces cifrados para resetear la contraseña de forma segura.

---

## 🗄️ Esquema de Base de Datos y Arquitectura

El sistema utiliza **PostgreSQL** a través de Supabase. Posee 8 tablas principales relacionadas entre sí garantizando la integridad referencial (en cascada):

1.  `users`: Cuentas de clientes y administradores con contraseñas encriptadas.
2.  `stores`: Multi-tenant base. Configuraciones (colores), propietario y estatus.
3.  `products`: Catálogo, precios, stock, imágenes en arreglo JSONB y control de variantes.
4.  `orders`: Encabezado de la transacción, total, status de envío, email del cliente y `stripe_session_id`.
5.  `order_items`: El desglose exacto de los artículos comprados, congelando el `unit_price` al momento histórico de la compra.
6.  `coupons`: Códigos de descuento con reglas de validación estricta y límite de usos temporales o definitivos.
7.  `reviews`: Comentarios, puntuaciones del 1 al 5 y relación al autor y al producto.
8.  `abandoned_carts`: Almacenamiento intermitente de la sesión del carrito de un usuario para su recuperación posterior o marketing.

El archivo `database_schema.sql` en la raíz contiene las queries de instalación de las tablas para una rápida portabilidad.

---

## 💻 Stack Tecnológico Utilizado

*   **Frontend (Cliente & Admin):** React 18, Vite, Tailwind CSS 3, React Router DOM (Manejo de rutas), React Query (Fetching y cache), Zustand (Estado de carrito y UI global), Recharts (Visualización de datos), Lucide React (Íconos SVG ligeros).
*   **Backend (Servidor API):** Node.js, Express.js (v4), TypeScript, JWT, Multer.
*   **Base de Datos & Storage:** PostgreSQL mediante Supabase SDK.
*   **Procesamiento de Pagos:** Stripe Node SDK & Stripe Webhooks (Autenticación estricta del Payload raw de Express).
*   **Servicio de Correo:** Resend API.

---

## 🛠️ Configuración e Instalación Local

1.  Clonar el repositorio de la aplicación.
2.  Instalar dependencias necesarias:
    ```bash
    npm install
    ```
3.  Configurar las variables de entorno duplicando `.env.example` como `.env`:
    ```env
    # Bases de Datos
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_ANON_KEY=tu_anon_key
    SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

    # Pasarela de Pagos
    STRIPE_SECRET_KEY=sk_test_xxx
    STRIPE_WEBHOOK_SECRET=whsec_xxx

    # Sistema de Mailing
    RESEND_API_KEY=re_xxx

    # Seguridad e Infraestructura
    JWT_SECRET=tu_llave_secreta_super_segura
    VITE_API_URL=/api
    ```
4.  Ejecutar el script SQL de creación de la base de datos `database_schema.sql` dentro de la interfaz SQL de tu proyecto en Supabase.
5.  Arrancar el entorno de desarrollo concurrente (cliente + servidor local):
    ```bash
    npm run dev
    ```

---

## 📦 Despliegue a Producción (Build)

Este proyecto emplea un modelo de compilación unificado Full-Stack para facilitar su alojamiento en plataformas como Google Cloud Run, Heroku o Render, en un único contenedor o proceso.

1.  **Construir artefactos:**
    ```bash
    npm run build
    ```
    *Este comando ejecutará la transpilación de Vite (Frontend) para emitir los estáticos en `/dist` y empaquetará (esbuild) `server.ts` como un CommonJS standalone en `/dist/server.cjs`.*
2.  **Iniciar el servicio en producción:**
    ```bash
    npm start
    ```
    *Inicia Express, que montará todas las rutas de API `/api/*` en los primeros middlewares de prioridad y enrutará cualquier otra petición a los archivos estáticos de React compilados, resolviendo el Single Page Application de forma perfecta.*
