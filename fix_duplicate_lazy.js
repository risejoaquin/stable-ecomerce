import fs from 'fs';

function fixDuplicateLazy(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/loading="lazy"\s*loading="lazy"/g, 'loading="lazy"');
  fs.writeFileSync(file, code);
}

fixDuplicateLazy('src/App.tsx');
fixDuplicateLazy('src/pages/store/HomePage.tsx');
fixDuplicateLazy('src/pages/store/ProductDetailPage.tsx');
fixDuplicateLazy('src/pages/store/WishlistPage.tsx');
fixDuplicateLazy('src/components/storefront/ProductCard.tsx');
