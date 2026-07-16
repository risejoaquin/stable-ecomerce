import fs from 'fs';

let code = fs.readFileSync('vite.config.ts', 'utf-8');

if (!code.includes('viteCompression')) {
  code = "import viteCompression from 'vite-plugin-compression';\n" + code;
  code = code.replace(
    `plugins: [react(), tailwindcss()],`,
    `plugins: [react(), tailwindcss(), viteCompression({ algorithm: 'brotliCompress' }), viteCompression({ algorithm: 'gzip' })],`
  );
  fs.writeFileSync('vite.config.ts', code);
}
