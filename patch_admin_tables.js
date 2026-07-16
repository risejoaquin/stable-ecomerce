import fs from 'fs';

function makeTablesScrollable(file) {
  let code = fs.readFileSync(file, 'utf-8');
  // Find <table... and wrap in <div className="overflow-x-auto"> if not already wrapped
  if (code.includes('<table') && !code.includes('overflow-x-auto')) {
    code = code.replace(/<table/g, '<div className="overflow-x-auto"><table');
    code = code.replace(/<\/table>/g, '</table></div>');
    fs.writeFileSync(file, code);
  }
}

makeTablesScrollable('src/pages/admin/AdminOrdersPage.tsx');
makeTablesScrollable('src/pages/admin/CouponsPage.tsx');
makeTablesScrollable('src/components/admin/ProductTable.tsx');
