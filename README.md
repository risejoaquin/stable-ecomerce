# E-Commerce Platform

A modern, full-stack e-commerce platform built with React, Vite, Express, and Supabase. The platform provides a public storefront for customers and a secure admin panel for store owners to manage products, orders, and store configurations.

## Features

- **Public Storefront:**
  - Product browsing with dynamic grid layouts.
  - Interactive shopping cart with local persistence.
  - Secure checkout process integrated with Stripe.
  - Dynamic store branding (colors, names) based on configuration.

- **Admin Dashboard:**
  - **Authentication:** Secured using Clerk.
  - **Product Management:** Full CRUD operations for products, including image uploads via Supabase Storage.
  - **Order Management:** View recent orders and track their fulfillment status.
  - **Store Settings:** Customize the store's visual identity (e.g., theme color).

## Tech Stack

- **Frontend:**
  - React 18 & Vite
  - Tailwind CSS for styling
  - React Router for navigation
  - TanStack Query (React Query) for data fetching and state management
  - Clerk for user authentication
  - React Hot Toast for notification toasts

- **Backend:**
  - Node.js & Express
  - Supabase (PostgreSQL) for database and object storage
  - Stripe for payment processing and checkout sessions
  - Multer for handling file uploads

## Version History & Updates

### v1.0.0 (Current) - Initial Release & MVP
- **Core Setup:** Initialized full-stack architecture with Express serving as the backend and Vite for the frontend.
- **Database Integration:** Integrated Supabase for storing stores, products, orders, and order items.
- **Authentication:** Integrated Clerk to protect admin routes and API endpoints.
- **Product CRUD & Storage:** Added the ability to create, read, update, and delete products. Implemented image uploading using `multer` and Supabase Storage.
- **Shopping Cart & Checkout:**
  - Implemented `CartContext` to manage shopping cart state with `localStorage` persistence.
  - Added a responsive `CartDrawer` UI.
  - Integrated Stripe Checkout API to handle payments securely.
- **Order Processing:**
  - Added order creation endpoint that validates stock.
  - Implemented Stripe webhooks to listen for `checkout.session.completed` events.
  - Automated order status updates and stock reduction upon successful payment.
- **Error Handling & UX:** Added centralized error handling and success notifications using `react-hot-toast` and TanStack Query's cache settings.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Project (Database & Storage)
- Stripe Account
- Clerk Account

### Environment Variables
Create a `.env` file in the root directory and add the following:

```env
# Server Config
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Clerk (Frontend)
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
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
npm start
```
