import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('RecoverCartPage')) {
  code = `import { RecoverCartPage } from './pages/store/RecoverCartPage';\n` + code;
  code = code.replace(
    `<Route path="/" element={<HomePage />} />`,
    `<Route path="/" element={<HomePage />} />\n          <Route path="/recover" element={<RecoverCartPage />} />`
  );
  fs.writeFileSync('src/App.tsx', code);
}
