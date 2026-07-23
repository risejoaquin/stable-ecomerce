const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Add a catch-all endpoint for frontend errors
if (!content.includes('/api/log-error')) {
  content = content.replace(
    "app.get('/api/health', asyncHandler(async (req, res) => {",
    "app.post('/api/log-error', express.json(), (req, res) => {\n  console.log('\\n\\n=== FRONTEND ERROR ===\\n', req.body.error, '\\n=====================\\n\\n');\n  res.json({ ok: true });\n});\n\napp.get('/api/health', asyncHandler(async (req, res) => {"
  );
  fs.writeFileSync('server.ts', content);
}
