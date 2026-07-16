import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('path="/sign-in"')) {
  code = "import { SafeSignIn, SafeSignUp } from './components/ClerkMock';\n" + code;
  code = code.replace(
    '<Route path="*" element={<NotFoundPage />} />',
    '<Route path="/sign-in/*" element={<SafeSignIn />} />\n          <Route path="/sign-up/*" element={<SafeSignUp />} />\n          <Route path="*" element={<NotFoundPage />} />'
  );
  fs.writeFileSync('src/App.tsx', code);
}
