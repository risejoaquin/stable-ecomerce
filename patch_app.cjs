const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf-8');

if (!appCode.includes("import { VerifyEmailPage }")) {
  appCode = appCode.replace(
    "import { SignUpPage } from './pages/SignUpPage';",
    "import { SignUpPage } from './pages/SignUpPage';\nimport { VerifyEmailPage } from './pages/VerifyEmailPage';"
  );
  
  appCode = appCode.replace(
    '<Route path="/sign-up" element={<SafeSignedOut><SignUpPage /></SafeSignedOut>} />',
    '<Route path="/sign-up" element={<SafeSignedOut><SignUpPage /></SafeSignedOut>} />\n          <Route path="/verify" element={<VerifyEmailPage />} />'
  );
  
  fs.writeFileSync('src/App.tsx', appCode);
}
