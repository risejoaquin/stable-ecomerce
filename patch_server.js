import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const oldProfile = `  app.get('/api/profile', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({});
    try {
      let { data, error } = await supabase.from('users').select('email, full_name, phone, shipping_address, billing_address').eq('id', req.auth.userId).single();
      
      if (error) {
        try {
          // Fallback if columns don't exist yet
          const fallback = await supabase.from('users').select('email, full_name').eq('id', req.auth.userId).single();
          if (fallback.error) throw fallback.error;
          data = fallback.data;
        } catch (fallbackError) {
          throw error; // throw original error if fallback fails
        }
      }
      res.json(data || {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/profile', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { email, fullName, phone, shippingAddress, billingAddress } = req.body;
      
      let updatePayload: any = {
        email,
        full_name: fullName,
        phone,
        shipping_address: shippingAddress,
        billing_address: billingAddress
      };

      let { error } = await supabase.from('users').update(updatePayload).eq('id', req.auth.userId);
      
      if (error) {
          try {
            // Fallback update
            updatePayload = { email, full_name: fullName };
            const fallback = await supabase.from('users').update(updatePayload).eq('id', req.auth.userId);
            if (fallback.error) throw fallback.error;
          } catch (fallbackError) {
             throw error;
          }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

const newProfile = `  app.get('/api/profile', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({});
    try {
      let { data, error } = await supabase.from('users').select('email, full_name, phone, addresses').eq('id', req.auth.userId).single();
      
      if (error) {
        try {
          // Fallback if columns don't exist yet
          const fallback = await supabase.from('users').select('email, full_name').eq('id', req.auth.userId).single();
          if (fallback.error) throw fallback.error;
          data = fallback.data;
        } catch (fallbackError) {
          throw error; // throw original error if fallback fails
        }
      }
      res.json(data || {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/profile', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { email, fullName, phone, addresses } = req.body;
      
      let updatePayload: any = {
        email,
        full_name: fullName,
        phone,
        addresses
      };

      let { error } = await supabase.from('users').update(updatePayload).eq('id', req.auth.userId);
      
      if (error) {
          try {
            // Fallback update
            updatePayload = { email, full_name: fullName };
            const fallback = await supabase.from('users').update(updatePayload).eq('id', req.auth.userId);
            if (fallback.error) throw fallback.error;
          } catch (fallbackError) {
             throw error;
          }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

content = content.replace(oldProfile, newProfile);
fs.writeFileSync('server.ts', content);
