import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /req\.headers\.origin \|\| \`\$\{req\.protocol\}:\/\/\$\{req\.get\('host'\)\}\`/g,
  `req.headers.origin || \`\${req.headers['x-forwarded-proto'] || req.protocol}://\${req.headers['x-forwarded-host'] || req.get('host')}\``
);

fs.writeFileSync('server.ts', content);
