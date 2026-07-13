import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const mockProducts = `const mockProducts = [
  {
    id: "prod_1",
    store_id: "store_mock",
    name: "Jordan 1 Triple White",
    slug: "jordan-1-triple-white",
    description: "Classic Jordan 1s in an all-white colorway. Timeless and versatile.",
    price: 150,
    stock: 50,
    status: 'active',
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "prod_2",
    store_id: "store_mock",
    name: "Muha Meds Habibi Wax Pen",
    slug: "muha-meds-habibi",
    description: "Premium wax pen with an exclusive Habibi flavor blend.",
    price: 45,
    stock: 100,
    status: 'active',
    images: ["https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "prod_3",
    store_id: "store_mock",
    name: "Purple Label Denim Pants",
    slug: "purple-label-denim",
    description: "High-quality denim pants from Purple Label, featuring a modern fit and premium wash.",
    price: 250,
    stock: 30,
    status: 'active',
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80"]
  }
];`;

code = code.replace(
  "app.get('/api/products/:id', async (req: any, res) => {",
  mockProducts + "\n\n  app.get('/api/products/:id', async (req: any, res) => {"
);

code = code.replace(
  "if (!supabase) return res.json(null);",
  "if (!supabase) { const prod = mockProducts.find(p => p.id === req.params.id); return prod ? res.json(prod) : res.status(404).json({ error: 'Product not found' }); }"
);

code = code.replace(
  "if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });",
  "if (!supabase) return res.json({ data: mockProducts, total: mockProducts.length, page: 1, pageSize: 20 });"
);

fs.writeFileSync('server.ts', code);
