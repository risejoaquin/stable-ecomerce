# Selfcare Sinners - E-Commerce Platform

A modern, full-stack e-commerce platform built with React, Vite, Express, and Supabase. The platform provides a public storefront for customers and a secure admin panel for store owners to manage products, orders, coupons, and store configurations.

## Features

- **Public Storefront:**
  - Product browsing with dynamic grid layouts.
  - Interactive shopping cart with local persistence.
  - Secure checkout process integrated with Stripe.
  - Wishlist functionality to save favorite products.
  - Dynamic store branding (colors, names, layouts) based on configuration.

- **Authentication & User Accounts:**
  - Custom JWT-based authentication using email and password.
  - Email verification powered by Resend.
  - User profiles and order history tracking.

- **Admin Dashboard:**
  - **Analytics:** View sales, total orders, and top products.
  - **Product Management:** Full CRUD operations for products, including image uploads via Supabase Storage.
  - **Order Management:** View recent orders, track fulfillment status, and add tracking numbers.
  - **Coupon Management:** Create, manage, and delete discount codes.
  - **Store Settings:** Customize the store's visual identity (theme color, logos, hero banner).

## Tech Stack

- **Frontend:**
  - React 18 & Vite
  - Tailwind CSS for styling
  - React Router for navigation
  - TanStack Query (React Query) for data fetching and state management
  - React Hot Toast for notification toasts
  - Lucide React for icons

- **Backend:**
  - Node.js & Express
  - Custom JWT Authentication (`jsonwebtoken`, `bcryptjs`)
  - Supabase (PostgreSQL) for database and object storage
  - Stripe for payment processing and checkout sessions
  - Multer for handling file uploads
  - Resend for email notifications and verifications

## Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Project (Database & Storage)
- Stripe Account
- Resend Account

### Environment Variables
Create a `.env` file in the root directory and add the following:

```env
# Server Config
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Resend
RESEND_API_KEY=your_resend_api_key
```

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

### Production Build
To build the application for production:
```bash
npm run build
```
Start the production server:
```bash
npm run start
```
