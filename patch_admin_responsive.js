import fs from 'fs';

function updatePadding(file) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(
    /className="p-10 flex flex-col gap-8 h-full overflow-y-auto"/g,
    'className="p-4 sm:p-10 flex flex-col gap-8 h-full overflow-y-auto"'
  );
  code = code.replace(
    /className="p-10"/g,
    'className="p-4 sm:p-10"'
  );
  // header in admin
  code = code.replace(
    /className="px-10 py-6 border-b border-\[#E5E5E1\] bg-white flex justify-between items-center shrink-0"/g,
    'className="px-4 sm:px-10 py-4 sm:py-6 border-b border-[#E5E5E1] bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0"'
  );
  code = code.replace(
    /className="h-20 px-10 flex items-center justify-between border-b border-\[#E5E5E1\] bg-white\/30 shrink-0"/g,
    'className="h-auto min-h-[5rem] px-4 sm:px-10 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E5E1] bg-white/30 shrink-0"'
  );
  fs.writeFileSync(file, code);
}

updatePadding('src/pages/admin/AdminDashboard.tsx');
updatePadding('src/pages/admin/AdminOrdersPage.tsx');
updatePadding('src/pages/admin/AdminSettingsPage.tsx');
updatePadding('src/pages/admin/ProductsPage.tsx');
updatePadding('src/pages/admin/CouponsPage.tsx');
updatePadding('src/App.tsx'); // Has AdminLayout
