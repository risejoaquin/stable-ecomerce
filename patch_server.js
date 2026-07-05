import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');
const injection = `
  // Products route for Tanstack Query hook (GET /api/products?store_slug=...)
  app.get('/api/products', async (req, res) => {
    if (!supabase) return res.json([]);
    try {
      const storeSlug = req.query.store_slug;
      if (!storeSlug) return res.json([]);
      
      const { data: store, error: storeError } = await supabase.from('stores').select('id').eq('slug', storeSlug).single();
      if (storeError || !store) return res.status(404).json({ error: 'Store not found' });
      
      const { data: products, error } = await supabase.from('products').select('*').eq('store_id', store.id);
      if (error) throw error;
      res.json(products || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

`;
const searchString = "  app.get('/api/public/store'";
code = code.replace(searchString, injection + searchString);
fs.writeFileSync('server.ts', code);
