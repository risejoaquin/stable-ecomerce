import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// replace normal imports
code = code.replace(`import { AdminDashboard } from './pages/admin/AdminDashboard';`, `const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));`);
code = code.replace(`import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';`, `const AdminOrdersPage = React.lazy(() => import('./pages/admin/AdminOrdersPage').then(module => ({ default: module.AdminOrdersPage })));`);
code = code.replace(`import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';`, `const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage').then(module => ({ default: module.AdminSettingsPage })));`);

// wrap AdminLayout content with Suspense
code = code.replace(
  `<Outlet />`,
  `<React.Suspense fallback={<div className="flex h-64 items-center justify-center">Loading...</div>}>\n              <Outlet />\n            </React.Suspense>`
);

if (!code.includes('React.lazy')) {
  fs.writeFileSync('src/App.tsx', code);
}
