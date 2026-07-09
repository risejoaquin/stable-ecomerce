import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /const pageSize = parseInt\(req\.query\.page_size as string\) \|\| 20;/g,
  `const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);`
);

fs.writeFileSync('server.ts', code);
