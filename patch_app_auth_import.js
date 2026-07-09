import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
if (!code.includes("import { useAuthSafe as useAuth }")) {
  code = "import { useAuthSafe as useAuth } from './hooks/useAuthSafe';\n" + code;
  fs.writeFileSync('src/App.tsx', code);
}
