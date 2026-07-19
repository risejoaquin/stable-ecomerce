import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/AdminCustomersPage.tsx', 'utf8');

content = content.replace(
  `const csvContent = customers.map((c: any) => 
      \`"\${c.email}","\${c.orders_count}","\${c.total_spent}","\${new Date(c.last_order_date).toLocaleString()}"\`
    ).join('\\n');`,
  `const csvContent = customers.map((c: any) => 
      \`"\${c.name}","\${c.email}","\${c.orders_count}","\${c.total_spent}","\${c.last_order_date ? new Date(c.last_order_date).toLocaleString() : 'Nunca'}"\`
    ).join('\\n');`
);

content = content.replace(
  `const headers = ['Email/ID', 'Orders Count', 'Total Spent', 'Last Order Date'];`,
  `const headers = ['Name', 'Email', 'Orders Count', 'Total Spent', 'Last Order Date'];`
);

content = content.replace(
`<p className="font-bold text-gray-900">{customer.email}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{customer.id !== customer.email ? customer.id : ''}</p>`,
`<p className="font-bold text-gray-900">{customer.name || customer.email}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{customer.email}</p>`
);

content = content.replace(
  `<td className="p-4 text-right">
                      <p className="text-sm text-gray-600">{new Date(customer.last_order_date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">{new Date(customer.last_order_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </td>`,
  `<td className="p-4 text-right">
                      {customer.last_order_date ? (
                        <>
                          <p className="text-sm text-gray-600">{new Date(customer.last_order_date).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">{new Date(customer.last_order_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 font-medium">Sin compras</p>
                      )}
                    </td>`
);

fs.writeFileSync('src/pages/admin/AdminCustomersPage.tsx', content);
