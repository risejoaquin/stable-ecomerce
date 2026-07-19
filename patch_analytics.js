import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const oldSalesEndpoint = `  app.get('/api/admin/analytics/sales', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ total_revenue: 0, total_orders: 0, average_order_value: 0, sales_by_day: [] });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      // Get last 30 days of paid orders
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders, error } = await supabase.from('orders')
        .select('total, created_at')
        .eq('store_id', store.id)
        .eq('status', 'paid')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      let total_revenue = 0;
      let total_orders = orders ? orders.length : 0;
      
      const sales_by_day_map: Record<string, { revenue: number, orders: number }> = {};
      
      if (orders) {
        orders.forEach((o: any) => {
          total_revenue += o.total;
          const date = new Date(o.created_at).toISOString().split('T')[0];
          if (!sales_by_day_map[date]) {
            sales_by_day_map[date] = { revenue: 0, orders: 0 };
          }
          sales_by_day_map[date].revenue += o.total;
          sales_by_day_map[date].orders += 1;
        });
      }

      const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;
      
      const sales_by_day = Object.keys(sales_by_day_map).map(date => ({
        date,
        revenue: sales_by_day_map[date].revenue,
        orders: sales_by_day_map[date].orders
      })).sort((a, b) => a.date.localeCompare(b.date));

      res.json({ total_revenue, total_orders, average_order_value, sales_by_day });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

const newSalesEndpoint = `  app.get('/api/admin/analytics/sales', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ total_revenue: 0, total_orders: 0, average_order_value: 0, sales_by_day: [], sales_by_month: [] });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      // Get all-time paid orders
      const { data: allOrders, error } = await supabase.from('orders')
        .select('total, created_at, customer_email, customer_user_id')
        .eq('store_id', store.id)
        .in('status', ['paid', 'pagado', 'empacado', 'enviado', 'entregado']);

      if (error) throw error;

      let total_revenue = 0;
      let total_orders = allOrders ? allOrders.length : 0;
      let unique_customers = new Set();
      
      const sales_by_day_map: Record<string, { revenue: number, orders: number }> = {};
      const sales_by_month_map: Record<string, { revenue: number, orders: number }> = {};
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (allOrders) {
        allOrders.forEach((o: any) => {
          total_revenue += o.total;
          
          if (o.customer_email) unique_customers.add(o.customer_email);
          else if (o.customer_user_id) unique_customers.add(o.customer_user_id);
          
          const createdDate = new Date(o.created_at);
          
          // Monthly
          const monthStr = createdDate.toISOString().slice(0, 7); // YYYY-MM
          if (!sales_by_month_map[monthStr]) {
            sales_by_month_map[monthStr] = { revenue: 0, orders: 0 };
          }
          sales_by_month_map[monthStr].revenue += o.total;
          sales_by_month_map[monthStr].orders += 1;
          
          // Daily (only last 30 days)
          if (createdDate >= thirtyDaysAgo) {
              const dateStr = createdDate.toISOString().split('T')[0];
              if (!sales_by_day_map[dateStr]) {
                sales_by_day_map[dateStr] = { revenue: 0, orders: 0 };
              }
              sales_by_day_map[dateStr].revenue += o.total;
              sales_by_day_map[dateStr].orders += 1;
          }
        });
      }

      const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;
      
      const sales_by_day = Object.keys(sales_by_day_map).map(date => ({
        date,
        revenue: sales_by_day_map[date].revenue,
        orders: sales_by_day_map[date].orders
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      const sales_by_month = Object.keys(sales_by_month_map).map(month => ({
        month,
        revenue: sales_by_month_map[month].revenue,
        orders: sales_by_month_map[month].orders
      })).sort((a, b) => a.month.localeCompare(b.month));

      res.json({ total_revenue, total_orders, average_order_value, sales_by_day, sales_by_month, total_customers: unique_customers.size });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

content = content.replace(oldSalesEndpoint, newSalesEndpoint);

const oldTopProducts = `  app.get('/api/admin/analytics/top_products', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('quantity, unit_price, product_id, orders!inner(store_id, status), products(name)')
        .eq('orders.store_id', store.id)
        .eq('orders.status', 'paid');
      
      if (error) throw error;

      const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};
      if (orderItems) {
         orderItems.forEach((item: any) => {
           if (!productStats[item.product_id]) {
             productStats[item.product_id] = { name: item.products?.name || 'Unknown', quantity: 0, revenue: 0 };
           }
           productStats[item.product_id].quantity += item.quantity;
           productStats[item.product_id].revenue += item.quantity * item.unit_price;
         });
      }

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      res.json(topProducts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

const newTopProducts = `  app.get('/api/admin/analytics/top_products', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('quantity, unit_price, product_id, orders!inner(store_id, status), products(name)')
        .eq('orders.store_id', store.id)
        .in('orders.status', ['paid', 'pagado', 'empacado', 'enviado', 'entregado']);
      
      if (error) throw error;

      const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};
      if (orderItems) {
         orderItems.forEach((item: any) => {
           if (!productStats[item.product_id]) {
             productStats[item.product_id] = { name: item.products?.name || 'Unknown', quantity: 0, revenue: 0 };
           }
           productStats[item.product_id].quantity += item.quantity;
           productStats[item.product_id].revenue += item.quantity * item.unit_price;
         });
      }

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      res.json(topProducts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

content = content.replace(oldTopProducts, newTopProducts);

const couponsEndpoint = `
  app.get('/api/admin/analytics/coupons', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: coupons, error } = await supabase.from('coupons')
        .select('code, discount_type, discount_value, current_uses')
        .eq('store_id', store.id)
        .order('current_uses', { ascending: false });

      if (error) throw error;
      res.json(coupons || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!content.includes('/api/admin/analytics/coupons')) {
  content = content.replace(
    `app.get('/api/admin/analytics/recent_orders'`,
    couponsEndpoint + `\n  app.get('/api/admin/analytics/recent_orders'`
  );
}

fs.writeFileSync('server.ts', content);
