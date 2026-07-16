import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const wishlistAndCartLogic = `
  // --- WISHLIST ENDPOINTS ---
  app.get('/api/wishlist', requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('product_id, products(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      res.json(data.map((d: any) => d.products));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/wishlist', requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { product_id } = req.body;
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert([{ user_id: userId, product_id }])
        .select();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/wishlist/:productId', requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { productId } = req.params;
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .match({ user_id: userId, product_id: productId });
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ABANDONED CART ENDPOINTS ---
  app.post('/api/cart/sync', async (req: any, res) => {
    try {
      // allow unauthenticated if email provided (for guest checkout step)
      let userId = null;
      try {
        if (req.auth?.userId) userId = req.auth.userId;
      } catch (e) {}
      
      const { email, items } = req.body;
      
      if (!userId && !email) {
        return res.json({ success: false, message: 'No user info' });
      }

      // Check if cart exists
      let query = supabase.from('abandoned_carts').select('id');
      if (userId) query = query.eq('user_id', userId);
      else query = query.eq('email', email);
      
      const { data: existing } = await query.single();
      
      if (existing) {
        await supabase
          .from('abandoned_carts')
          .update({ items, updated_at: new Date().toISOString(), reminder_sent: false })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('abandoned_carts')
          .insert([{ user_id: userId, email, items }]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/cart/recover', async (req, res) => {
    try {
      const { token } = req.query; // cart id
      if (!token) return res.status(400).json({ error: 'Missing token' });
      
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('id', token)
        .single();
        
      if (error || !data) throw new Error('Cart not found');
      res.json({ items: data.items });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- CRON JOB ABANDONED CART ---
  setInterval(async () => {
    try {
      if (!supabase || !resend) return;
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: carts, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('reminder_sent', false)
        .not('email', 'is', null)
        .lt('updated_at', twoHoursAgo);
        
      if (error) {
        console.error('Error fetching abandoned carts:', error);
        return;
      }
      
      for (const cart of carts || []) {
        if (!cart.items || cart.items.length === 0) continue;
        
        // Ensure email is valid
        if (!cart.email || !cart.email.includes('@')) continue;

        const recoverUrl = \`\${process.env.VITE_APP_URL || 'http://localhost:3000'}/recover?token=\${cart.id}\`;
        
        const html = \`
          <h2>Did you forget something?</h2>
          <p>We saved your cart for you.</p>
          <ul>
            \${cart.items.map((i: any) => \`<li>\${i.name} - $\${i.price} (x\${i.quantity})</li>\`).join('')}
          </ul>
          <a href="\${recoverUrl}" style="padding: 10px 20px; background: #6B705C; color: white; text-decoration: none; border-radius: 5px;">Recover Cart</a>
        \`;
        
        await sendEmail({
          to: cart.email,
          subject: 'Complete your purchase',
          html
        });
        
        await supabase
          .from('abandoned_carts')
          .update({ reminder_sent: true })
          .eq('id', cart.id);
      }
    } catch (e) {
      console.error('Cron job error:', e);
    }
  }, 60 * 60 * 1000); // run every hour
`;

// Insert the endpoints before the vite middleware setup or static files
const insertPoint = `if (process.env.NODE_ENV !== 'production') {`;

if (code.includes(insertPoint) && !code.includes('/api/wishlist')) {
  code = code.replace(insertPoint, wishlistAndCartLogic + '\n\n  ' + insertPoint);
}

fs.writeFileSync('server.ts', code);
