import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!content.includes('AdminCustomersPage')) {
  content = content.replace(
    `import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';`,
    `import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';\nimport { AdminCustomersPage } from './pages/admin/AdminCustomersPage';`
  );
}

// Add route
if (!content.includes('path="customers"')) {
  content = content.replace(
    `<Route path="orders" element={<AdminOrdersPage />} />`,
    `<Route path="orders" element={<AdminOrdersPage />} />\n            <Route path="customers" element={<AdminCustomersPage />} />`
  );
}

// Add link in layout
content = content.replace(
  `<Link to="/admin" className={navItemClass('/admin')}>Dashboard</Link>
          <Link to="/admin/products" className={navItemClass('/admin/products')}>Products</Link>
          <Link to="/admin/coupons" className={navItemClass('/admin/coupons')}>Coupons</Link>
          <Link to="/admin/orders" className={navItemClass('/admin/orders')}>Orders</Link>
          <Link to="/admin/settings" className={navItemClass('/admin/settings')}>Store Settings</Link>`,
  `<Link to="/admin" className={navItemClass('/admin')}>Dashboard</Link>
          <Link to="/admin/products" className={navItemClass('/admin/products')}>Productos</Link>
          <Link to="/admin/coupons" className={navItemClass('/admin/coupons')}>Cupones</Link>
          <Link to="/admin/orders" className={navItemClass('/admin/orders')}>Pedidos</Link>
          <Link to="/admin/customers" className={navItemClass('/admin/customers')}>Clientes</Link>
          <Link to="/admin/settings" className={navItemClass('/admin/settings')}>Configuración</Link>`
);

fs.writeFileSync('src/App.tsx', content);
