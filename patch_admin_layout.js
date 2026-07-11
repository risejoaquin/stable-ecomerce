import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  `className="flex min-h-screen bg-[#F7F6F2] font-sans text-[#333]"`,
  `className="flex flex-col md:flex-row min-h-screen bg-[#F7F6F2] font-sans text-[#333]"`
);

code = code.replace(
  `className="w-[260px] bg-white border-r border-[#E5E5E1] py-10 px-6 flex flex-col shrink-0"`,
  `className="w-full md:w-[260px] md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-[#E5E5E1] py-6 md:py-10 px-6 flex flex-col shrink-0"`
);

fs.writeFileSync('src/App.tsx', code);
