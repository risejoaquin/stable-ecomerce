import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf-8');
const start = server.indexOf("app.get('/api/test-email'");
const end = server.indexOf("app.get('/api/wishlist'");
if (start !== -1 && end !== -1) {
  server = server.substring(0, start) + server.substring(end);
  fs.writeFileSync('server.ts', server);
}
