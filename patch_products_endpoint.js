import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const oldProductsQuery = `      let query = supabase.from('products').select('*', { count: 'exact' }).eq('store_id', store.id).eq('status', 'active');
      
      if (search) {
        query = query.ilike('name', \`%\${search}%\`);
      }
      if (minPrice) query = query.gte('price', minPrice);
      if (maxPrice) query = query.lte('price', maxPrice);`;

const newProductsQuery = `      const category = req.query.category as string;
      let query = supabase.from('products').select('*', { count: 'exact' }).eq('store_id', store.id).eq('status', 'active');
      
      if (search) {
        query = query.ilike('name', \`%\${search}%\`);
      }
      if (minPrice) query = query.gte('price', minPrice);
      if (maxPrice) query = query.lte('price', maxPrice);
      if (category && category !== 'all') query = query.eq('category', category);`;

content = content.replace(oldProductsQuery, newProductsQuery);
fs.writeFileSync('server.ts', content);
