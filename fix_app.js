import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the implementations
code = code.replace(/function AdminProductsPage\(\) \{[\s\S]*?(function ProductFormModal)/, '$1');
code = code.replace(/function ProductFormModal\(\{ product, onClose \}: \{ product: any, onClose: \(\) => void \}\) \{[\s\S]*?(function AdminSettingsPage)/, '$1');

// Replace the components mapping
code = code.replace(/<AdminProductsPage \/>/g, '<ProductsPage />');

fs.writeFileSync('src/App.tsx', code);
