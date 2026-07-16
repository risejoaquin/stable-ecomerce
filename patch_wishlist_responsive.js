import fs from 'fs';
let code = fs.readFileSync('src/pages/store/WishlistPage.tsx', 'utf-8');

code = code.replace(
  `className="max-w-7xl mx-auto px-8 py-12 min-h-[60vh]"`,
  `className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 min-h-[60vh]"`
);

fs.writeFileSync('src/pages/store/WishlistPage.tsx', code);
