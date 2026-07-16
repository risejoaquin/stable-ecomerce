import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

// 1. Update /api/products
const oldProductsEndpoint = /app\.get\('\/api\/products', async \(req, res\) => \{[\s\S]*?\}\);/;
const newProductsEndpoint = `
  app.get('/api/products', async (req, res) => {
    if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
    try {
      const storeSlug = req.query.store_slug;
      if (!storeSlug) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
      
      const { data: store, error: storeError } = await supabase.from('stores').select('id').eq('slug', storeSlug).single();
      if (storeError || !store) return res.status(404).json({ error: 'Store not found' });
      
      const search = req.query.search as string;
      const minPrice = req.query.min_price;
      const maxPrice = req.query.max_price;
      const sortBy = (req.query.sort_by as string) || 'created_at';
      const order = (req.query.order as string) || 'desc';
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;

      let query = supabase.from('products').select('*', { count: 'exact' }).eq('store_id', store.id);
      
      if (search) {
        query = query.ilike('name', \`%\${search}%\`);
      }
      if (minPrice) query = query.gte('price', minPrice);
      if (maxPrice) query = query.lte('price', maxPrice);
      
      query = query.order(sortBy, { ascending: order === 'asc' });
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: products, error, count } = await query;
      
      if (error) throw error;
      res.json({ data: products || [], total: count || 0, page, pageSize });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;
code = code.replace(oldProductsEndpoint, newProductsEndpoint.trim());

// 2. Add /api/orders/my and /api/orders/track
const apiRoutesIndex = code.indexOf('// API Routes');
if (apiRoutesIndex !== -1 && !code.includes("app.get('/api/orders/my'")) {
    const additionalEndpoints = `
  app.get('/api/orders/my', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('customer_user_id', req.auth.userId).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/orders/track', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
      const email = req.query.email as string;
      const orderId = req.query.order_id as string;
      if (!email || !orderId) return res.status(400).json({ error: 'Email and order_id required' });

      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(name, images))').eq('id', orderId).ilike('customer_email', email).single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Order not found' });
      
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

`;
    code = code.slice(0, apiRoutesIndex) + additionalEndpoints + code.slice(apiRoutesIndex);
}

// 3. Add /api/admin/orders/:id/tracking
const adminOrdersRefundIndex = code.indexOf("app.post('/api/admin/orders/:id/refund'");
if (adminOrdersRefundIndex !== -1 && !code.includes("app.put('/api/admin/orders/:id/tracking'")) {
    const trackingEndpoint = `
  app.put('/api/admin/orders/:id/tracking', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const { tracking_number, notes } = req.body;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });
      
      const { data, error } = await supabase.from('orders').update({ tracking_number, notes }).eq('id', id).eq('store_id', store.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

`;
    code = code.slice(0, adminOrdersRefundIndex) + trackingEndpoint + code.slice(adminOrdersRefundIndex);
}

fs.writeFileSync('server.ts', code);
