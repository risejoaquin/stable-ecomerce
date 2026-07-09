import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');
code = code.replace(
  `<ProductRating productId={product.id} themeColor={themeColor} />`,
  ``
);
fs.writeFileSync('src/pages/store/HomePage.tsx', code);
