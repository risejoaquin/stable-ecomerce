import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  `status: 'pending',`,
  `status: 'pendiente',`
);

fs.writeFileSync('server.ts', content);
