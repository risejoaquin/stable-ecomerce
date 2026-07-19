import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const customersEndpoint = `
  app.get('/api/admin/customers', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      // Get all-time paid orders
      const { data: allOrders, error } = await supabase.from('orders')
        .select('total, created_at, customer_email, customer_user_id')
        .eq('store_id', store.id)
        .in('status', ['paid', 'pagado', 'empacado', 'enviado', 'entregado']);

      if (error) throw error;

      if (!allOrders) return res.json([]);

      // Aggregate by customer (prefer email, fallback to user_id)
      const customersMap: Record<string, { id: string, email: string, orders_count: number, total_spent: number, last_order_date: string }> = {};

      allOrders.forEach((o: any) => {
        const id = o.customer_email || o.customer_user_id || 'Invitado';
        const email = o.customer_email || 'Sin correo';
        
        if (!customersMap[id]) {
          customersMap[id] = {
            id,
            email,
            orders_count: 0,
            total_spent: 0,
            last_order_date: o.created_at
          };
        }
        
        customersMap[id].orders_count += 1;
        customersMap[id].total_spent += o.total;
        
        if (new Date(o.created_at) > new Date(customersMap[id].last_order_date)) {
          customersMap[id].last_order_date = o.created_at;
        }
      });

      const customersList = Object.values(customersMap).sort((a, b) => b.total_spent - a.total_spent);

      res.json(customersList);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!content.includes('/api/admin/customers')) {
  content = content.replace(
    `app.get('/api/admin/analytics/sales'`,
    customersEndpoint + `\n  app.get('/api/admin/analytics/sales'`
  );
}

fs.writeFileSync('server.ts', content);
