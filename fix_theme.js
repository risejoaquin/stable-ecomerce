import fs from 'fs';

let code = fs.readFileSync('src/components/ThemeProvider.tsx', 'utf-8');

code = code.replace(
  `\\\`\\"\\\${\\fontName}\\", sans-serif\\\``,
  '`"${fontName}", sans-serif`'
);

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/components/ThemeProvider.tsx', code);
