import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('ProductDetailPage')) {
  code = `import { ProductDetailPage } from './pages/store/ProductDetailPage';\n` + code;
  code = code.replace(
    `<Route path="/" element={<HomePage />} />`,
    `<Route path="/" element={<HomePage />} />\n          <Route path="/product/:id" element={<ProductDetailPage />} />`
  );
}
fs.writeFileSync('src/App.tsx', code);
