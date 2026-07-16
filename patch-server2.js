import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');

const apiProxy = `
  // --- API PROXY ---
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
  app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '', // Remove /api prefix if the backend doesn't expect it
    },
  }));
`;

const patched = content.replace(/  \/\/ --- API ROUTES ---[\s\S]*?res\.status\(404\)\.json\(\{ error: 'Not found' \}\);\n  \}\);/g, apiProxy);
fs.writeFileSync('server.ts', patched);
