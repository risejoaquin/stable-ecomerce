import fs from 'fs';

const pages = [
  'src/pages/store/MyOrdersPage.tsx',
  'src/pages/store/WishlistPage.tsx',
  'src/pages/store/TrackOrderPage.tsx'
];

for (const page of pages) {
  let code = fs.readFileSync(page, 'utf-8');
  if (!code.includes('StoreHeader')) {
    code = "import { StoreHeader } from '../../components/storefront/StoreHeader';\n" + code;
    
    // Most of them have: <header className="h-20 ...">...</header>
    const headerRegex = /<header className="h-20.*?<\/header>/s;
    if (headerRegex.test(code)) {
      code = code.replace(headerRegex, '<StoreHeader />');
      fs.writeFileSync(page, code);
    }
  }
}
