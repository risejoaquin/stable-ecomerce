import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const newRoutes = `
  // --- REVIEWS ---
  app.get('/api/products/:productId/reviews', async (req: any, res) => {
    if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      res.json({ data: data || [], total: count || 0, page, pageSize });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/products/:productId/rating', async (req: any, res) => {
    if (!supabase) return res.json({ average: 0, count: 0 });
    try {
      const { productId } = req.params;
      const { data, count, error } = await supabase
        .from('reviews')
        .select('rating', { count: 'exact' })
        .eq('product_id', productId);
      
      if (error) throw error;
      
      let average = 0;
      if (data && data.length > 0) {
        const sum = data.reduce((acc: number, cur: any) => acc + cur.rating, 0);
        average = sum / data.length;
      }
      res.json({ average, count: count || 0 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/products/:productId/reviews', clerkMiddleware(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      if (!req.auth || !req.auth.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { productId } = req.params;
      const { rating, comment } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Invalid rating' });
      }

      const { data, error } = await supabase.from('reviews').insert([{
        product_id: productId,
        user_id: req.auth.userId,
        rating,
        comment
      }] as any[]).select().single();
      
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- COUPONS ---
  app.get('/api/admin/coupons', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data, error } = await supabase.from('coupons').select('*').eq('store_id', store.id).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/coupons', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const coupon = { ...req.body, store_id: store.id };
      const { data, error } = await supabase.from('coupons').insert([coupon] as any[]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/coupons/:id', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { id } = req.params;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { error } = await supabase.from('coupons').delete().eq('id', id).eq('store_id', store.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/coupons/validate', async (req: any, res) => {
    if (!supabase) return res.json({ valid: true, discountAmount: 10 });
    try {
      const { code, storeId, orderTotal } = req.body;
      const { data: coupon, error } = await supabase.from('coupons')
        .select('*')
        .eq('code', code)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        return res.status(400).json({ error: 'Invalid coupon code' });
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Coupon expired' });
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return res.status(400).json({ error: 'Coupon usage limit reached' });
      }

      if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) {
        return res.status(400).json({ error: \`Minimum order amount is \${coupon.min_order_amount}\` });
      }

      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = (orderTotal * coupon.discount_value) / 100;
      } else {
        discountAmount = coupon.discount_value;
      }

      res.json({ valid: true, discountAmount, coupon });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ANALYTICS ---
  app.get('/api/admin/analytics/sales', requireAuth(), async (req: any, res) => {
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
  });

  app.get('/api/admin/analytics/top_products', requireAuth(), async (req: any, res) => {
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
  });

  app.get('/api/admin/analytics/recent_orders', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: orders, error } = await supabase.from('orders')
        .select('id, total, status, created_at, customer_email')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      res.json(orders || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

code = code.replace(
  "app.get('/api/public/store', async (req, res) => {",
  newRoutes + "\n  app.get('/api/public/store', async (req, res) => {"
);

// We need to modify /api/orders creation to accept couponCode and discountAmount
const ordersInsertOld = `      // @ts-ignore
      const { data: order, error: orderError } = await supabase.from('orders').insert([{
        store_id: storeId,
        customer_user_id: req.auth?.userId || null,
        status: 'pending',
        total
      }] as any[]).select().single();`;

const ordersInsertNew = `      let finalTotal = total;
      let couponCode = req.body.couponCode;
      let discountAmount = 0;
      
      if (couponCode) {
        const { data: coupon } = await supabase.from('coupons').select('*').eq('code', couponCode).eq('store_id', storeId).eq('is_active', true).single();
        if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) && (!coupon.max_uses || coupon.current_uses < coupon.max_uses) && (!coupon.min_order_amount || total >= coupon.min_order_amount)) {
            if (coupon.discount_type === 'percentage') {
                discountAmount = (total * coupon.discount_value) / 100;
            } else {
                discountAmount = coupon.discount_value;
            }
            finalTotal = total - discountAmount;
            if (finalTotal < 0) finalTotal = 0;
            
            await supabase.from('coupons').update({ current_uses: coupon.current_uses + 1 }).eq('id', coupon.id);
        } else {
            couponCode = null; // invalid
        }
      }

      // @ts-ignore
      const { data: order, error: orderError } = await supabase.from('orders').insert([{
        store_id: storeId,
        customer_user_id: req.auth?.userId || null,
        status: 'pending',
        total: finalTotal,
        coupon_code: couponCode,
        discount_amount: discountAmount
      }] as any[]).select().single();`;

code = code.replace(ordersInsertOld, ordersInsertNew);

fs.writeFileSync('server.ts', code);
