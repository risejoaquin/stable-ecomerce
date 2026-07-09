import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const newRoute = `
  app.get('/api/products/:id', async (req: any, res) => {
    if (!supabase) return res.json(null);
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(404).json({ error: 'Product not found' });
    }
  });
`;

code = code.replace(
  "app.get('/api/products', async (req, res) => {",
  newRoute + "\n  app.get('/api/products', async (req, res) => {"
);

fs.writeFileSync('server.ts', code);
