import fs from 'fs';
let code = fs.readFileSync('src/pages/store/MyOrdersPage.tsx', 'utf-8');
if (!code.includes('<EmptyState')) {
  code = `import { EmptyState } from '../../components/EmptyState';\n` + code;
  code = code.replace(
    `<div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">\n              <p className="text-gray-500 text-lg">You haven't placed any orders yet.</p>\n            </div>`,
    `<EmptyState title="No orders yet" description="You haven't placed any orders yet." actionText="Start Shopping" actionLink="/" />`
  );
  fs.writeFileSync('src/pages/store/MyOrdersPage.tsx', code);
}
