import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('CouponsPage')) {
  code = `import { AdminDashboard } from './pages/admin/AdminDashboard';\n` + code;
  code = `import { CouponsPage } from './pages/admin/CouponsPage';\n` + code;
  
  // Remove the old AdminDashboard implementation from App.tsx
  const oldAdminDashboardStart = `function AdminDashboard() {`;
  const nextFunctionStart = `function AdminLayout() {`;
  if (code.includes(oldAdminDashboardStart)) {
      const parts = code.split(oldAdminDashboardStart);
      const parts2 = parts[1].split(nextFunctionStart);
      code = parts[0] + nextFunctionStart + parts2[1];
  }

  code = code.replace(
    `<Route path="products" element={<ProductsPage />} />`,
    `<Route path="products" element={<ProductsPage />} />\n            <Route path="coupons" element={<CouponsPage />} />`
  );
  
  code = code.replace(
    `<Link to="/admin/products" className={navItemClass('/admin/products')}>Products</Link>`,
    `<Link to="/admin/products" className={navItemClass('/admin/products')}>Products</Link>\n          <Link to="/admin/coupons" className={navItemClass('/admin/coupons')}>Coupons</Link>`
  );
}
fs.writeFileSync('src/App.tsx', code);
