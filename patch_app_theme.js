import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('ThemeProvider')) {
  code = `import { ThemeProvider } from './components/ThemeProvider';\n` + code;
  code = code.replace(
    `<QueryClientProvider client={queryClient}>`,
    `<QueryClientProvider client={queryClient}>\n      <ThemeProvider>`
  );
  code = code.replace(
    `</QueryClientProvider>`,
    `</ThemeProvider>\n      </QueryClientProvider>`
  );
}

fs.writeFileSync('src/App.tsx', code);
