import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "app.get('/api/products', async (req, res) => {\n    res.set('Cache-Control', 'public, max-age=60');\n    if (!supabase) return res.json({ data: mockProducts, total: mockProducts.length, page: 1, pageSize: 20 });",
  "app.get('/api/products', async (req, res) => {\n    res.set('Cache-Control', 'public, max-age=60');\n    return res.json({ data: mockProducts, total: mockProducts.length, page: 1, pageSize: 20 });"
);

code = code.replace(
  "app.get('/api/products/:id', async (req: any, res) => {\n    res.set('Cache-Control', 'public, max-age=60');\n    if (!supabase) { const prod = mockProducts.find(p => p.id === req.params.id); return prod ? res.json(prod) : res.status(404).json({ error: 'Product not found' }); }",
  "app.get('/api/products/:id', async (req: any, res) => {\n    res.set('Cache-Control', 'public, max-age=60');\n    const prod = mockProducts.find(p => p.id === req.params.id);\n    if (prod) return res.json(prod);"
);

fs.writeFileSync('server.ts', code);
