import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "mode: 'payment',",
  "mode: 'payment',\n        shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'MX'] },"
);

fs.writeFileSync('server.ts', code);
