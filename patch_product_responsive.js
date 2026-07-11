import fs from 'fs';
let code = fs.readFileSync('src/pages/store/ProductDetailPage.tsx', 'utf-8');

// Padding on main container
code = code.replace(
  `className="flex-1 p-8 max-w-7xl mx-auto w-full py-12"`,
  `className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full py-8 sm:py-12"`
);

// Grid gap
code = code.replace(
  `className="grid grid-cols-1 md:grid-cols-2 gap-12"`,
  `className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12"`
);

fs.writeFileSync('src/pages/store/ProductDetailPage.tsx', code);
