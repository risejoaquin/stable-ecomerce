import fs from 'fs';

// Fix useStoreConfig
let code = fs.readFileSync('src/hooks/useStoreConfig.ts', 'utf-8');
code = code.replace(/apiClient\.get\(`\/api\/public\/store\/\$\{slug\}`\)/g, "apiClient.get(`/public/store/${slug}`)");
code = code.replace(/apiClient\.get\('\/api\/public\/store'\)/g, "apiClient.get('/public/store')");
fs.writeFileSync('src/hooks/useStoreConfig.ts', code);

// Fix useProducts
let code2 = fs.readFileSync('src/hooks/useProducts.ts', 'utf-8');
code2 = code2.replace(/apiClient\.get\(`\/api\/products\?store_slug=\$\{storeSlug\}`\)/g, "apiClient.get(`/products?store_slug=${storeSlug}`)");
code2 = code2.replace(/apiClient\.post\("\/api\/admin\/products", newProduct\)/g, 'apiClient.post("/admin/products", newProduct)');
fs.writeFileSync('src/hooks/useProducts.ts', code2);
