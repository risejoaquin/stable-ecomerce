import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  "import { VerifyEmailPage } from './components/VerifyEmailPage';",
  ""
);

if (!app.includes("import { VerifyEmailPage }")) {
  app = app.replace(
    "import { RecoverCartPage } from './pages/store/RecoverCartPage';",
    "import { RecoverCartPage } from './pages/store/RecoverCartPage';\nimport { VerifyEmailPage } from './pages/store/VerifyEmailPage';"
  );
}

fs.writeFileSync('src/App.tsx', app);
