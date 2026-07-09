import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /app\.get\('\/api\/admin\/orders\/:id', requireAuth\(\), async \(req: any, res\) => \{\s+if \(!supabase\) return res\.status\(404\)\.json\(\{ error: 'Supabase not configured' \}\);\s+try \{\s+const \{ id \} = req\.params;\s+let customerDetails = null;/;

const newCode = `app.get('/api/admin/orders/:id', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: order, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('id', id).eq('store_id', store.id).single();
      if (error) throw error;
      let customerDetails = null;`;

code = code.replace(regex, newCode);

fs.writeFileSync('server.ts', code);
