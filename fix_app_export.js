import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const firstApp = code.indexOf('export default function App() {\n  return (\n    <ErrorBoundary>');
if (firstApp !== -1) {
  const endFirstApp = code.indexOf('}\n\nexport default function App() {\n  const routerContent');
  if (endFirstApp !== -1) {
    code = code.substring(0, firstApp) + code.substring(endFirstApp + 2);
    fs.writeFileSync('src/App.tsx', code);
  }
}
