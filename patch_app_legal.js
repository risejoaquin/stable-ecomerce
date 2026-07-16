import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const imports = `
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsAndConditionsPage } from './pages/legal/TermsAndConditionsPage';
import { ReturnPolicyPage } from './pages/legal/ReturnPolicyPage';
import { ContactPage } from './pages/legal/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CookieConsent } from './components/CookieConsent';
`;

if (!code.includes('PrivacyPolicyPage')) {
  code = imports + code;
  
  const routes = `
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsAndConditionsPage />} />
          <Route path="/returns" element={<ReturnPolicyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
  `;
  
  code = code.replace(
    `<Route path="/recover" element={<RecoverCartPage />} />`,
    `<Route path="/recover" element={<RecoverCartPage />} />${routes}`
  );
  
  code = code.replace(
    `</BrowserRouter>`,
    `  <CookieConsent />\n    </BrowserRouter>`
  );
  
  fs.writeFileSync('src/App.tsx', code);
}
