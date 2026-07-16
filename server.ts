import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  // --- SECURITY MIDDLEWARES ---
  // Block common bot scanners (e.g., /wp-admin, .php, .env files)
  app.use((req, res, next) => {
    const url = req.url.toLowerCase();
    if (url.startsWith('/wp-') || url.match(/\.(php|env|ini|asp|aspx|jsp)$/)) {
      return res.status(404).send('Not Found');
    }
    next();
  });

  // --- API PROXY ---
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
  app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
