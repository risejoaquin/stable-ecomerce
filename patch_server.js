import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace clerk imports
code = code.replace(
  "import { clerkMiddleware, requireAuth } from '@clerk/express';",
  `import jwt from 'jsonwebtoken';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

const requireAuth = () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
      req.auth = { userId: decoded.sub, email: decoded.email };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
};

const optionalAuth = () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
        req.auth = { userId: decoded.sub, email: decoded.email };
      } catch (err) {
        // Ignore
      }
    }
    next();
  };
};
`
);

code = code.replace(
  "if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {\n  process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;\n}",
  ""
);

code = code.replace(
  "app.use('/api', clerkMiddleware());",
  "app.use('/api', optionalAuth());"
);

// We need to replace individual route usages if they use `clerkMiddleware()` as route-level middleware.
code = code.replace(/clerkMiddleware\(\), /g, "optionalAuth(), ");

fs.writeFileSync('server.ts', code);
