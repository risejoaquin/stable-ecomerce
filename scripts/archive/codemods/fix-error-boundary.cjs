const fs = require('fs');

let content = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf8');
content = content.replace(
  "fetch('/api/health?error=' + encodeURIComponent(error.message + '\\n' + error.stack + '\\n' + errorInfo.componentStack));",
  "fetch('/api/log-error', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ error: error.message + '\\n' + error.stack + '\\n' + errorInfo.componentStack })\n    });"
);
fs.writeFileSync('src/components/ErrorBoundary.tsx', content);
