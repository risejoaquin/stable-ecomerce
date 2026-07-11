import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');
if (!code.includes('<EmptyState')) {
  code = `import { EmptyState } from '../../components/EmptyState';\n` + code;
  code = code.replace(
    `<tr>\n                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">\n                    No orders found matching the criteria.\n                  </td>\n                </tr>`,
    `<tr>\n                  <td colSpan={6} className="p-0">\n                    <EmptyState title="No orders found" description="There are no orders matching the current criteria." />\n                  </td>\n                </tr>`
  );
  fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
}
