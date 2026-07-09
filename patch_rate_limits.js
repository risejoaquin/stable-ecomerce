import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  `app.post('/api/orders', clerkMiddleware(), async (req: any, res) => {`,
  `app.post('/api/orders', clerkMiddleware(), orderLimiter, async (req: any, res) => {`
);
code = code.replace(
  `app.post('/api/checkout', async (req, res) => {`,
  `app.post('/api/checkout', checkoutLimiter, async (req, res) => {`
);

fs.writeFileSync('server.ts', code);
