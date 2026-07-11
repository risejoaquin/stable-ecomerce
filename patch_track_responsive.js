import fs from 'fs';

let code = fs.readFileSync('src/pages/store/TrackOrderPage.tsx', 'utf-8');
code = code.replace(
  `className="flex-1 max-w-3xl mx-auto w-full p-8 flex flex-col"`,
  `className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-8 flex flex-col"`
);
code = code.replace(
  `className="flex justify-between items-start mb-6"`,
  `className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6"`
);
fs.writeFileSync('src/pages/store/TrackOrderPage.tsx', code);

