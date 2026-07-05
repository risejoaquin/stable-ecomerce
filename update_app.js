import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the HomePage function
code = code.replace(/function HomePage\(\) \{[\s\S]*?\}\n\nfunction AdminDashboard/, 'function AdminDashboard');

// Add import
if (!code.includes("import { HomePage }")) {
  code = code.replace("import { ProductsPage } from './pages/admin/ProductsPage';", "import { ProductsPage } from './pages/admin/ProductsPage';\nimport { HomePage } from './pages/store/HomePage';");
}

fs.writeFileSync('src/App.tsx', code);
