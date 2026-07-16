import fs from 'fs';
let code = fs.readFileSync('src/pages/store/ProductDetailPage.tsx', 'utf-8');

if (!code.includes('StoreHeader')) {
  code = "import { StoreHeader } from '../../components/storefront/StoreHeader';\n" + code;
  
  const oldHeaderRegex = /\{\/\* Header \*\/\}\s*<header className="h-20.*?<\/header>/s;
  code = code.replace(oldHeaderRegex, '{/* Header */}\n        <StoreHeader backButton />');
  fs.writeFileSync('src/pages/store/ProductDetailPage.tsx', code);
}
