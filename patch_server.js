import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

if (!code.includes("import fs from 'fs';")) {
  code = "import fs from 'fs';\n" + code;
}

const viteMiddlewareStr = `app.use(vite.middlewares);`;
const viteFallback = `
    app.use('*', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
`;

if (!code.includes("template = await vite.transformIndexHtml")) {
  code = code.replace(viteMiddlewareStr, viteMiddlewareStr + "\n" + viteFallback);
}

fs.writeFileSync('server.ts', code);
