import fs from 'fs';
let content = fs.readFileSync('src/hooks/useSearchProducts.ts', 'utf8');
content = content.replace(
  "if (filters?.category && filters.category !== 'all') params.append('category', filters.category);",
  "if (filters?.category && filters.category !== 'all') params.append('category', filters.category);\n      if (filters?.subcategory && filters.subcategory !== 'all') params.append('subcategory', filters.subcategory);"
);
fs.writeFileSync('src/hooks/useSearchProducts.ts', content);
