import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "app.post('/api/orders', async (req, res) => {",
  "app.post('/api/orders', clerkMiddleware(), async (req: any, res) => {"
);

code = code.replace(
  "        store_id: storeId,\n        status: 'pending',\n        total",
  "        store_id: storeId,\n        customer_user_id: req.auth?.userId || null,\n        status: 'pending',\n        total"
);

fs.writeFileSync('server.ts', code);
