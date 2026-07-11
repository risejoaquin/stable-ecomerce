import fs from 'fs';
let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

// Padding on main container
code = code.replace(
  `className="flex-1 p-8 max-w-7xl mx-auto w-full"`,
  `className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full"`
);

// Filters and search bar on mobile (currently w-full md:w-64) which is mostly okay, but we can make the gap smaller on mobile
code = code.replace(
  `className="flex flex-col md:flex-row gap-8 items-start"`,
  `className="flex flex-col md:flex-row gap-6 md:gap-8 items-start"`
);

// Hero banner padding and font sizes (already uses md:text-6xl)
code = code.replace(
  `className="relative w-full h-[50vh] min-h-[400px] flex items-center justify-center text-center p-8 bg-gray-100 overflow-hidden"`,
  `className="relative w-full h-[40vh] sm:h-[50vh] min-h-[300px] sm:min-h-[400px] flex items-center justify-center text-center p-4 sm:p-8 bg-gray-100 overflow-hidden"`
);
code = code.replace(
  `className="text-5xl md:text-6xl font-bold mb-6 tracking-tight"`,
  `className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 tracking-tight"`
);

// Footer padding
code = code.replace(
  `className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4"`,
  `className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left"`
);

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
