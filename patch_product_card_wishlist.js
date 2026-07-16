import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

if (!code.includes('WishlistButton')) {
  code = `import { WishlistButton } from '../../components/storefront/WishlistButton';\n` + code;
  code = code.replace(
    `<Link to={\`/product/\${product.id}\`}><h3 className="font-bold text-lg mb-1 line-clamp-1 hover:underline cursor-pointer" style={{ color: textColor }}>{product.name}</h3></Link>`,
    `<div className="flex justify-between items-start gap-4">\n          <Link to={\`/product/\${product.id}\`} className="flex-1"><h3 className="font-bold text-lg mb-1 line-clamp-1 hover:underline cursor-pointer" style={{ color: textColor }}>{product.name}</h3></Link>\n          <WishlistButton productId={product.id} className="flex-shrink-0 -mt-1 -mr-1" />\n        </div>`
  );
  fs.writeFileSync('src/pages/store/HomePage.tsx', code);
}
