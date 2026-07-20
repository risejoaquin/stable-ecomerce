import fs from 'fs';
let content = fs.readFileSync('src/components/admin/ProductTable.tsx', 'utf8');

content = content.replace(
  '<th className="font-medium">Category</th>',
  '<th className="font-medium">Category</th>\n          <th className="font-medium">Subcategoría</th>'
);

content = content.replace(
  '<td className="text-gray-500 text-xs">{p.category || \'-\'}</td>',
  '<td className="text-gray-500 text-xs">{p.category || \'-\'}</td>\n            <td className="text-gray-500 text-xs">{p.subcategory || \'-\'}</td>'
);

fs.writeFileSync('src/components/admin/ProductTable.tsx', content);
