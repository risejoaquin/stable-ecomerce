import fs from 'fs';

let code = fs.readFileSync('src/pages/store/ProductDetailPage.tsx', 'utf-8');

if (!code.includes('WishlistButton')) {
  code = `import { WishlistButton } from '../../components/storefront/WishlistButton';\n` + code;
  code = code.replace(
    `<h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif" style={{ color: textColor }}>{product.name}</h1>`,
    `<div className="flex justify-between items-start gap-4">\n              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif" style={{ color: textColor }}>{product.name}</h1>\n              <WishlistButton productId={product.id} className="mt-1" />\n            </div>`
  );
  fs.writeFileSync('src/pages/store/ProductDetailPage.tsx', code);
}
