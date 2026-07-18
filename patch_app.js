import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  "import { RecoverCartPage } from './components/RecoverCartPage';",
  "import { RecoverCartPage } from './components/RecoverCartPage';\nimport { VerifyEmailPage } from './components/VerifyEmailPage';"
);

app = app.replace(
  '<Route path="/recover" element={<RecoverCartPage />} />',
  '<Route path="/recover" element={<RecoverCartPage />} />\n          <Route path="/verify-email" element={<VerifyEmailPage />} />'
);

fs.writeFileSync('src/App.tsx', app);
