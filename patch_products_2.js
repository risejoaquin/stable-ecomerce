import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const replacement = `if (!supabase) return res.json({ data: mockProducts, total: mockProducts.length, page: 1, pageSize: 20 });`;

code = code.replace(
  "if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });",
  replacement
);

fs.writeFileSync('server.ts', code);
