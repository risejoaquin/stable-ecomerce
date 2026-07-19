import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const oldCustomersEndpoint = `  app.get('/api/admin/customers', requireAuth(), async (req: any, res) => {
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
  });`;

const newCustomersEndpoint = `  app.get('/api/admin/customers', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      // Get all registered users
      const { data: allUsers } = await supabase.from('users').select('id, email, full_name, created_at');

      // Get all-time paid orders
      const { data: allOrders, error } = await supabase.from('orders')
        .select('total, created_at, customer_email, customer_user_id')
        .eq('store_id', store.id)
        .in('status', ['paid', 'pagado', 'empacado', 'enviado', 'entregado']);

      if (error) throw error;

      const customersMap: Record<string, { id: string, email: string, name: string, orders_count: number, total_spent: number, last_order_date: string | null }> = {};

      // First add all registered users
      if (allUsers) {
        allUsers.forEach((u: any) => {
          customersMap[u.id] = {
            id: u.id,
            email: u.email,
            name: u.full_name || '',
            orders_count: 0,
            total_spent: 0,
            last_order_date: null // No orders yet
          };
          
          // Also index by email for guest orders linking
          if (u.email && !customersMap[u.email]) {
             customersMap[u.email] = customersMap[u.id];
          }
        });
      }

      // Then add/aggregate orders
      if (allOrders) {
        allOrders.forEach((o: any) => {
          let customerRef = null;
          
          if (o.customer_user_id && customersMap[o.customer_user_id]) {
            customerRef = customersMap[o.customer_user_id];
          } else if (o.customer_email && customersMap[o.customer_email]) {
            customerRef = customersMap[o.customer_email];
          }
          
          // If guest order not linked to user, create a temporary entry
          if (!customerRef) {
            const id = o.customer_email || 'Invitado-' + Math.random();
            customerRef = {
              id,
              email: o.customer_email || 'Sin correo',
              name: 'Invitado',
              orders_count: 0,
              total_spent: 0,
              last_order_date: null
            };
            customersMap[id] = customerRef;
          }
          
          customerRef.orders_count += 1;
          customerRef.total_spent += o.total;
          
          if (!customerRef.last_order_date || new Date(o.created_at) > new Date(customerRef.last_order_date)) {
            customerRef.last_order_date = o.created_at;
          }
        });
      }

      // Deduplicate by taking unique object references
      const uniqueCustomers = Array.from(new Set(Object.values(customersMap)));
      
      const customersList = uniqueCustomers.sort((a, b) => {
        // Sort by total spent, then by orders count, then by email
        if (b.total_spent !== a.total_spent) return b.total_spent - a.total_spent;
        if (b.orders_count !== a.orders_count) return b.orders_count - a.orders_count;
        return a.email.localeCompare(b.email);
      });

      res.json(customersList);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

content = content.replace(oldCustomersEndpoint, newCustomersEndpoint);

fs.writeFileSync('server.ts', content);
