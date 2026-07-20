# React E-Commerce Storefront

A fully functional, modern e-commerce application built with React, Vite, Tailwind CSS, and a Node.js Express backend.

## Features

*   **Shopping Experience**: Product catalog, search, category filtering, and sorting.
*   **User Accounts**: Authentication (Sign In, Sign Up, Password Recovery) using JWT and Supabase.
*   **Cart & Wishlist**: Manage items you want to buy now or save for later.
*   **Checkout**: Integrated with Stripe for secure payments.
*   **Order Management**: Track order status and receive email confirmations (via Resend).
*   **Admin Dashboard**: Manage products and store configuration.
*   **Responsive Design**: Built with Tailwind CSS for a seamless experience on all devices.

## Tech Stack

*   **Frontend**: React, Vite, Tailwind CSS, React Router, React Query, Zustand (Store)
*   **Backend**: Node.js, Express, TypeScript
*   **Database**: Supabase (PostgreSQL)
*   **Payments**: Stripe
*   **Emails**: Resend

## Setup Instructions

1.  Clone the repository.
2.  Install dependencies: \`npm install\`
3.  Configure environment variables in a \`.env\` file (based on \`.env.example\`).
4.  Run the development server: \`npm run dev\`

## Environment Variables

Make sure to set the following environment variables in your \`.env\` file:

*   \`SUPABASE_URL\`: Your Supabase project URL.
*   \`SUPABASE_ANON_KEY\`: Your Supabase anon key.
*   \`SUPABASE_SERVICE_ROLE_KEY\`: Your Supabase service role key (for backend admin tasks).
*   \`STRIPE_SECRET_KEY\`: Your Stripe secret key.
*   \`STRIPE_WEBHOOK_SECRET\`: Your Stripe webhook secret.
*   \`RESEND_API_KEY\`: Your Resend API key.
*   \`JWT_SECRET\`: A secure random string for signing JWT tokens.

## Build for Production

Run \`npm run build\` to build the frontend and backend for production.
Then run \`npm start\` to start the server.
