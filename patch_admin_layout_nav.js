import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The nav item should be flex-row horizontally scrollable on mobile maybe?
// Or we just leave it flex col since it's an admin dashboard, but usually we use a hamburger menu or horizontal scroll.
// Let's use horizontal scroll for nav on mobile.
code = code.replace(
  `nav className="flex-1 flex flex-col"`,
  `nav className="flex-1 flex flex-row overflow-x-auto md:flex-col md:overflow-visible gap-2 md:gap-0 pb-2 md:pb-0"`
);

code = code.replace(
  `const navItemClass = (path: string) => {
    const isActive = location.pathname === path;
    return \`px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-all cursor-pointer block \${isActive ? 'bg-[#6B705C] text-white' : 'text-[#6B705C] hover:bg-gray-50'}\`;
  };`,
  `const navItemClass = (path: string) => {
    const isActive = location.pathname === path;
    return \`px-4 py-3 rounded-xl text-sm font-medium md:mb-1 whitespace-nowrap transition-all cursor-pointer block \${isActive ? 'bg-[#6B705C] text-white' : 'text-[#6B705C] hover:bg-gray-50'}\`;
  };`
);

fs.writeFileSync('src/App.tsx', code);
