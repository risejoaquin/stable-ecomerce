const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  "console.log('\\n\\n=== FRONTEND ERROR ===\\n', req.body.error, '\\n=====================\\n\\n');",
  "fs.appendFileSync('frontend-error.log', req.body.error + '\\n\\n');"
);
content = content.replace(
  "import pinoHttp from 'pino-http';",
  "import pinoHttp from 'pino-http';\nimport * as fs from 'fs';"
);
fs.writeFileSync('server.ts', content);
