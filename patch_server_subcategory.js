import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// For req.query
content = content.replace(
  "const category = req.query.category as string;",
  "const category = req.query.category as string;\n      const subcategory = req.query.subcategory as string;"
);

// For filtering
content = content.replace(
  "if (category && category !== 'all') query = query.eq('category', category);",
  "if (category && category !== 'all') query = query.eq('category', category);\n      if (subcategory && subcategory !== 'all') query = query.eq('subcategory', subcategory);"
);

fs.writeFileSync('server.ts', content);
