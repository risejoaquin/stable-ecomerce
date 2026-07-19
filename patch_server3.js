import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  `const updateData: any = { status: 'paid' };`,
  `const updateData: any = { status: 'pagado' };`
);

content = content.replace(
  `app.post('/api/checkout', checkoutLimiter, async (req: any, res) => {`,
  `// marker` // Wait, what about default order status created? Let's check checkout
);

fs.writeFileSync('server.ts', content);
