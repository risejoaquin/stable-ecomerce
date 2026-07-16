# Ecommerce Application

A modern ecommerce application built with React, TypeScript, and a custom Go backend.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Go, standard library `net/http`
- **Database**: PostgreSQL (hosted on Supabase)
- **Authentication**: Custom JWT based authentication (No Clerk or Supabase Auth)
- **Email Service**: Resend (used for email verification and notifications)
- **Payments**: Stripe

## Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
VITE_API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_here

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=postgresql://...

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

RESEND_API_KEY=re_...
FROM_EMAIL=Store <onboarding@resend.dev>
ADMIN_EMAIL=admin@example.com
```

## Running the Application

Since the environment uses Vite to serve the React frontend, use the following to start the Vite dev server:

```bash
npm run dev
```

Note: The Go backend code is located in the `go-backend` directory and needs to be compiled and run separately using `go run cmd/server/main.go` (if configured) on a system that has Go installed. The current setup serves the frontend locally.
