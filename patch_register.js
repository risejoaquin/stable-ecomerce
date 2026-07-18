import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf-8');

if (!server.includes("import crypto from 'crypto';")) {
    server = "import crypto from 'crypto';\n" + server;
}

server = server.replace(
  "        .insert([{ id: require('crypto').randomUUID(), email, password_hash, full_name }])",
  "        .insert([{ id: crypto.randomUUID(), email, password_hash, full_name }])"
);

fs.writeFileSync('server.ts', server);
