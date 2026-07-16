import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes("import { useCheckout }")) {
  code = code.replace("import { HomePage } from './pages/store/HomePage';", "import { HomePage } from './pages/store/HomePage';\nimport { useCheckout } from './hooks/useCheckout';");
}

code = code.replace(/const checkout = useMutation\(\{[\s\S]*?onError: \(err: any\) => alert\(err\.message\)\n  \}\);/, "const checkout = useCheckout(storeId);");

fs.writeFileSync('src/App.tsx', code);
