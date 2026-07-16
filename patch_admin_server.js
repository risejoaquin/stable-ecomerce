import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const oldAdminOrders = /app\.get\('\/api\/admin\/orders', requireAuth\(\), async \(req: any, res\) => \{[\s\S]*?\}\);/;
const newAdminOrders = `
  app.get('/api/admin/orders', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });

      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;

      let query = supabase.from('orders').select('*, order_items(*)', { count: 'exact' }).eq('store_id', store.id);
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw error;
      res.json({ data: data || [], total: count || 0, page, pageSize });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;
code = code.replace(oldAdminOrders, newAdminOrders.trim());

fs.writeFileSync('server.ts', code);
