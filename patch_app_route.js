import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('ResetPasswordPage')) {
  content = content.replace(
    `import { CheckoutSuccessPage } from './pages/store/CheckoutSuccessPage';`,
    `import { CheckoutSuccessPage } from './pages/store/CheckoutSuccessPage';\nimport { ResetPasswordPage } from './pages/store/ResetPasswordPage';`
  );
  
  content = content.replace(
    `<Route path="/checkout/success" element={<CheckoutSuccessPage />} />`,
    `<Route path="/checkout/success" element={<CheckoutSuccessPage />} />\n          <Route path="/reset-password" element={<ResetPasswordPage />} />`
  );
  fs.writeFileSync('src/App.tsx', content);
}
