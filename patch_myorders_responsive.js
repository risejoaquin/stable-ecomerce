import fs from 'fs';
let code = fs.readFileSync('src/pages/store/MyOrdersPage.tsx', 'utf-8');

code = code.replace(
  `className="flex-1 max-w-5xl mx-auto w-full p-8 flex flex-col"`,
  `className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 flex flex-col"`
);

code = code.replace(
  `className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100"`,
  `className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 pb-4 border-b border-gray-100"`
);

fs.writeFileSync('src/pages/store/MyOrdersPage.tsx', code);
