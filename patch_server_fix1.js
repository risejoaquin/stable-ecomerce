import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /const \{ data, error \} = await supabase\.from\('orders'\)\.select\('\*, order_items\(\*, products\(\*\)\)'\)\.eq\('customer_user_id', req\.auth\.userId\)\.order\('created_at', \{ ascending: false \}\);/;
const injection = `      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('customer_user_id', req.auth.userId).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

code = code.replace(regex, injection.trim());
fs.writeFileSync('server.ts', code);
