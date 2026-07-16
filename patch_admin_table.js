import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');

// Update Table headers
code = code.replace(
  '<th className="font-medium pb-2">Order ID</th>\n                <th className="font-medium pb-2">Date</th>',
  '<th className="font-medium pb-2">Order ID</th>\n                <th className="font-medium pb-2">Date</th>\n                <th className="font-medium pb-2">Customer</th>'
);

// Update Table rows
code = code.replace(
  '<td className="font-mono text-xs text-gray-500">#{o.id.split(\'-\')[0]}</td>\n                  <td className="text-gray-600">{new Date(o.created_at).toLocaleString()}</td>',
  '<td className="font-mono text-xs text-gray-500">#{o.id.split(\'-\')[0]}</td>\n                  <td className="text-gray-600">{new Date(o.created_at).toLocaleString()}</td>\n                  <td className="text-gray-900">{o.customerDetails?.name || o.customer_email || \'Guest\'}</td>'
);

fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
