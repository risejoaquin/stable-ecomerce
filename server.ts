import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'fallback_secret';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  // Block common bot scanners
  app.use((req, res, next) => {
    const url = req.url.toLowerCase();
    if (url.startsWith('/wp-') || url.match(/\.(php|env|ini|asp|aspx|jsp)$/)) {
      return res.status(404).send('Not Found');
    }
    next();
  });

  const apiRouter = express.Router();
  apiRouter.use(express.json());

  apiRouter.post('/auth/register', async (req, res) => {
    const { email, password, full_name } = req.body;
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email in use' });
      
      const hash = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      await pool.query(
        'INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [id, email, hash, full_name]
      );
      const token = jwt.sign({ id, email, full_name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id, email, full_name } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = userRes.rows[0];
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
      
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
      
      const token = jwt.sign({ id: user.id, email: user.email, full_name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.get('/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userRes = await pool.query('SELECT id, email, full_name FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length === 0) return res.status(401).json({ error: 'User not found' });
      res.json(userRes.rows[0]);
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  apiRouter.get('/public/store', async (req, res) => {
    try {
      const stores = await pool.query("SELECT * FROM stores WHERE status = 'active' LIMIT 1");
      if (stores.rows.length === 0) return res.json({ store: null, items: [] });
      const store = stores.rows[0];
      const products = await pool.query('SELECT * FROM products WHERE store_id = $1', [store.id]);
      res.json({ store, items: products.rows });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.get('/products', async (req, res) => {
    try {
      const { store_slug } = req.query;
      if (!store_slug) return res.status(400).json({ error: 'store_slug is required' });
      const stores = await pool.query("SELECT * FROM stores WHERE slug = $1", [store_slug]);
      if (stores.rows.length === 0) return res.json([]);
      const store = stores.rows[0];
      const products = await pool.query('SELECT * FROM products WHERE store_id = $1', [store.id]);
      res.json(products.rows);
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.get('/products/:id', async (req, res) => {
    try {
      const products = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
      if (products.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(products.rows[0]);
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  apiRouter.get('/admin/store', requireAuth, async (req: any, res) => {
    try {
      const stores = await pool.query("SELECT * FROM stores WHERE owner_user_id = $1", [req.user.id]);
      if (stores.rows.length === 0) return res.json({ hasStore: false });
      res.json({ hasStore: true, store: stores.rows[0] });
    } catch(err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.post('/admin/store', requireAuth, async (req: any, res) => {
    const { name } = req.body;
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await pool.query("SELECT id FROM stores WHERE owner_user_id = $1", [req.user.id]);
      if (existing.rows.length > 0) {
        // update
        await pool.query('UPDATE stores SET name = $1, slug = $2 WHERE owner_user_id = $3', [name, slug, req.user.id]);
        res.json({ success: true });
      } else {
        // create
        await pool.query('INSERT INTO stores (owner_user_id, name, slug) VALUES ($1, $2, $3)', [req.user.id, name, slug]);
        res.json({ success: true });
      }
    } catch(err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.get('/admin/products', requireAuth, async (req: any, res) => {
    try {
      const stores = await pool.query("SELECT id FROM stores WHERE owner_user_id = $1", [req.user.id]);
      if (stores.rows.length === 0) return res.json([]);
      const storeId = stores.rows[0].id;
      const products = await pool.query('SELECT * FROM products WHERE store_id = $1', [storeId]);
      res.json(products.rows);
    } catch(err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.post('/admin/products', requireAuth, async (req: any, res) => {
    try {
      const stores = await pool.query("SELECT id FROM stores WHERE owner_user_id = $1", [req.user.id]);
      if (stores.rows.length === 0) return res.status(400).json({ error: 'Store not found' });
      const storeId = stores.rows[0].id;
      const { name, description, price, stock, images } = req.body;
      await pool.query(
        'INSERT INTO products (store_id, name, description, price, stock, images) VALUES ($1, $2, $3, $4, $5, $6)',
        [storeId, name, description, price, stock, images]
      );
      res.json({ success: true });
    } catch(err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.put('/admin/products/:id', requireAuth, async (req: any, res) => {
    try {
      const { name, description, price, stock, images } = req.body;
      await pool.query(
        'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, images = $5 WHERE id = $6',
        [name, description, price, stock, images, req.params.id]
      );
      res.json({ success: true });
    } catch(err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.delete('/admin/products/:id', requireAuth, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch(err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  apiRouter.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', apiRouter);

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
