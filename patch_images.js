import fs from 'fs';

function addLazy(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/<img (src=[^>]+) \/>/g, '<img $1 loading="lazy" />');
  code = code.replace(/<img (src=[^>]+)(className=[^>]+) \/>/g, '<img $1 $2 loading="lazy" />');
  code = code.replace(/<img src=\{product\.images\[0\]\} alt=\{product\.name\} className="(.*?)" \/>/g, '<img src={product.images[0]} alt={product.name} className="$1" loading="lazy" />');
  code = code.replace(/<img src=\{item\.image\} alt=\{item\.name\} className="(.*?)" \/>/g, '<img src={item.image} alt={item.name} className="$1" loading="lazy" />');
  fs.writeFileSync(file, code);
}

addLazy('src/pages/store/HomePage.tsx');
addLazy('src/pages/store/ProductDetailPage.tsx');
addLazy('src/pages/store/WishlistPage.tsx');
addLazy('src/components/storefront/ProductCard.tsx');
addLazy('src/App.tsx');
