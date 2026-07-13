import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "if (!supabase) return res.json({ store: { name: 'Terra & Tide', config: { themeColor: '#6B705C' } }, products: [] });",
  "if (!supabase) return res.json({ store: { name: 'Terra & Tide', slug: 'terra-and-tide', config: { themeColor: '#6B705C' } }, products: mockProducts });"
);

code = code.replace(
  "if (error || !store) return res.json({ store: { name: 'Terra & Tide', config: { themeColor: '#6B705C' } }, products: [] });",
  "if (error || !store) return res.json({ store: { name: 'Terra & Tide', slug: 'terra-and-tide', config: { themeColor: '#6B705C' } }, products: mockProducts });"
);

fs.writeFileSync('server.ts', code);
