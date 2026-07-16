import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const adminOrdersRegex = /app\.get\('\/api\/admin\/orders', requireAuth\(\), async \(req: any, res\) => \{[\s\S]*?\}\);/;

const newEndpoints = `
  app.get('/api/admin/orders', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.json([]);
      const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('store_id', store.id).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/orders/:id', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: order, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('id', id).eq('store_id', store.id).single();
      if (error) throw error;
      if (!order) return res.status(404).json({ error: 'Order not found' });

      let customerDetails = null;
      let shippingDetails = null;

      if (stripe && order.stripe_session_id) {
        try {
           const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
           customerDetails = session.customer_details;
           shippingDetails = session.shipping_details;
        } catch(e) {
           console.error("Failed to fetch stripe session", e);
        }
      }

      res.json({ ...order, customerDetails, shippingDetails });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/orders/:id/status', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });
      
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).eq('store_id', store.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/orders/:id/refund', requireAuth(), async (req: any, res) => {
    if (!supabase || !stripe) return res.status(500).json({ error: 'Not configured' });
    try {
      const { id } = req.params;
      const { amount } = req.body; // optional amount
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });
      
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', id).eq('store_id', store.id).single();
      if (error) throw error;
      if (!order || !order.stripe_session_id) return res.status(400).json({ error: 'Cannot refund this order' });

      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (!session.payment_intent) return res.status(400).json({ error: 'No payment intent found' });
      
      const refundParams: any = {
        payment_intent: session.payment_intent as string,
      };
      if (amount) {
         refundParams.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundParams);
      
      // Update status to refunded
      const newStatus = amount && amount < order.total ? 'partially_refunded' : 'refunded';
      const { data: updatedOrder } = await supabase.from('orders').update({ status: newStatus }).eq('id', id).select().single();

      res.json(updatedOrder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

code = code.replace(adminOrdersRegex, newEndpoints);
fs.writeFileSync('server.ts', code);
