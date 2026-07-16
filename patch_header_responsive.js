import fs from 'fs';
let code = fs.readFileSync('src/components/storefront/StoreHeader.tsx', 'utf-8');

// Make header wrap on small screens
code = code.replace(
  `className="h-20 px-8 max-w-7xl mx-auto w-full flex items-center justify-between border-b"`,
  `className="min-h-20 py-4 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 border-b"`
);

// We should also adjust padding in main content in HomePage and other pages if they have fixed h-20 etc.
fs.writeFileSync('src/components/storefront/StoreHeader.tsx', code);
