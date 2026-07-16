import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace function AdminOrdersPage() { ... } with import
const regex = /function AdminOrdersPage\(\) \{[\s\S]*?\}\n\nfunction AdminLayout/m;
if (regex.test(code)) {
    code = code.replace(regex, 'function AdminLayout');
}

if (!code.includes("import { AdminOrdersPage }")) {
    code = code.replace("import { ProductsPage } from './pages/admin/ProductsPage';", "import { ProductsPage } from './pages/admin/ProductsPage';\nimport { AdminOrdersPage } from './pages/admin/AdminOrdersPage';");
}

fs.writeFileSync('src/App.tsx', code);
